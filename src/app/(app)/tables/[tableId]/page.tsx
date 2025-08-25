
"use client";

import React, { useEffect, useState, useMemo, useActionState, startTransition } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { onSnapshot, doc, updateDoc, serverTimestamp, increment, writeBatch, getDoc } from 'firebase/firestore';
import type { Table as TableType, ParsedPreset, ColumnDef, User } from '@/lib/types';
import { parsePresetString } from '@/lib/utils';
import Link from 'next/link';

import LoadingSpinner from '@/components/loading-spinner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Download, Plus, Trash2, Loader2, Sparkles, Share2, MoreVertical, AlertTriangle, Link as LinkIcon, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFormStatus } from 'react-dom';
import { populateTableColumns } from '@/app/actions/tables';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


function InputField({ column, value, onChange, onBlur, onKeyDown }: { column: ColumnDef, value: any, onChange: (value: any) => void, onBlur?: () => void, onKeyDown?: (e: React.KeyboardEvent) => void }) {
  switch (column.type) {
    case 'number':
      return <Input autoFocus id={column.value} type="number" value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} placeholder={column.name} />;
    case 'boolean':
      return <div className="flex items-center h-10"><Checkbox id={column.value} checked={!!value} onCheckedChange={(checked) => { onChange(checked); if (onBlur) onBlur(); }} /></div>;
    case 'json':
      return <Textarea autoFocus id={column.value} value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} placeholder={column.name} />;
    case 'text':
    default:
      return <Input autoFocus id={column.value} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} onKeyDown={onKeyDown} placeholder={column.name} />;
  }
}

function AIToolsForm({ table, parsedPreset }: { table: TableType, parsedPreset: ParsedPreset }) {
    const { user } = useAuth();
    const [initialState, action] = useActionState(populateTableColumns, { error: undefined, success: undefined });
    const { toast } = useToast();
    const isPaidUser = user?.subscriptionPlan !== 'Free';
    
    React.useEffect(() => {
        if (initialState?.error) {
            toast({ variant: 'destructive', title: 'AI Completion Failed', description: initialState.error });
        }
        if (initialState?.success) {
            toast({ title: 'Success!', description: 'Your table has been updated with AI-generated content.' });
        }
    }, [initialState, toast]);

    return (
        <Card>
            <form action={action}>
                 <input type="hidden" name="tableId" value={table.id} />
                <input type="hidden" name="userId" value={user?.uid} />

                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles /> AI Bulk Completion
                        {!isPaidUser && (
                            <Badge variant="outline" className="border-primary text-primary">Premium</Badge>
                        )}
                    </CardTitle>
                    <CardDescription>Automatically fill in empty cells based on your instructions and existing data in each row.</CardDescription>
                </CardHeader>
                <fieldset disabled={!isPaidUser}>
                    <CardContent className="grid gap-4">
                        {!isPaidUser && (
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Upgrade to Unlock</AlertTitle>
                                <AlertDescription>
                                    This is a premium feature. Please <Link href="/pricing" className="font-bold text-primary hover:underline">upgrade your plan</Link> to use AI Bulk Completion.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <div className="col-span-full">
                                <Label>1. Select columns to fill</Label>
                            </div>
                            {parsedPreset.columns.map(col => (
                                <div key={col.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`col-${col.value}`}
                                        name="columns"
                                        value={col.value}
                                    />
                                    <Label htmlFor={`col-${col.value}`} className="font-normal">{col.name}</Label>
                                </div>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="prompt">2. Describe how to fill them</Label>
                            <Textarea
                                id="prompt"
                                name="prompt"
                                required
                                className="min-h-[100px] mt-2"
                                placeholder={'e.g., "Based on the product description, write a short, catchy marketing tagline."'}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <AIFormSubmitButton />
                    </CardFooter>
                </fieldset>
            </form>
        </Card>
    )
}

function AIFormSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="ml-auto">
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generate
        </Button>
    )
}

function ShareDialog({ isOpen, onOpenChange, table, user }: { isOpen: boolean, onOpenChange: (open: boolean) => void, table: TableType, user: User }) {
    const { toast } = useToast();
    const isProOrEnterprise = user.subscriptionPlan === 'Creator' || user.subscriptionPlan === 'Power';

    const handleCopy = (link: string) => {
        navigator.clipboard.writeText(link);
        toast({ title: 'Link copied to clipboard!' });
    };

    const publicLink = `${window.location.origin}/view/${user.uid}/${table.id}`;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share "{table.name}"</DialogTitle>
                    <DialogDescription>
                        Choose how you want to share your table. Access permissions are based on your selections.
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="public" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="public">Public</TabsTrigger>
                        <TabsTrigger value="collaborate" disabled={!isProOrEnterprise}>Collaborate</TabsTrigger>
                        <TabsTrigger value="direct" disabled={!isProOrEnterprise}>Direct Link</TabsTrigger>
                    </TabsList>
                    <TabsContent value="public" className="mt-4 space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Public Link</CardTitle>
                                <CardDescription>Anyone with this link can view and download the latest version of your table. No sign-in required.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex space-x-2">
                                    <Input value={publicLink} readOnly />
                                    <Button onClick={() => handleCopy(publicLink)} variant="secondary" size="icon">
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="collaborate" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">Collaborative Link <Badge variant="outline">Premium</Badge></CardTitle>
                                <CardDescription>Invite others to edit this table with you in real-time. (Coming Soon)</CardDescription>
                            </CardHeader>
                             <CardContent>
                               <Button disabled>Generate Collaborative Link</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="direct" className="mt-4">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">Direct Link <Badge variant="outline">Premium</Badge></CardTitle>
                                <CardDescription>Get a direct URL to your latest exported file, perfect for use in projects. (Coming Soon)</CardDescription>
                            </CardHeader>
                             <CardContent>
                               <Button disabled>Get Direct Link</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

export default function TableEditorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tableId = params.tableId as string;

  const [table, setTable] = useState<TableType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [rowToDelete, setRowToDelete] = useState<Record<string, any> | null>(null);
  
  const [editingCell, setEditingCell] = useState<{rowId: string; columnValue: string} | null>(null);
  const [cellEditValue, setCellEditValue] = useState<any>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const parsedPreset: ParsedPreset | null = useMemo(() => {
    if (table) return parsePresetString(table.presetString);
    return null;
  }, [table]);

  const handleExportClick = () => {
    if (!table || !parsedPreset) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Table data or preset is not available.' });
      return;
    }

    try {
      let output = '';
      (table.data || []).forEach(row => {
        let rowString = parsedPreset.writeAs;
        parsedPreset.columns.forEach(col => {
          const placeholder = new RegExp(col.write.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
          const value = row[col.value] ?? '';
          rowString = rowString.replace(placeholder, String(value));
        });
        output += rowString + '\n';
      });

      const fileName = `${table.name}${parsedPreset.exportAs}`;

      const blob = new Blob([output], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Export Successful', description: `Your file ${fileName} has started downloading.` });

    } catch (err: any) {
      console.error("Client-side export failed:", err);
      toast({ variant: 'destructive', title: 'Export Failed', description: err.message || 'An unknown error occurred during export.' });
    }
  };


  useEffect(() => {
    if (!user || !tableId) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid, 'tables', tableId), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            
            if (!data.createdAt || !data.lastEdited) {
                return; 
            }

            const tableData: TableType = {
                id: doc.id,
                name: data.name,
                presetString: data.presetString,
                fileType: data.fileType,
                tags: data.tags,
                data: data.data,
                size: data.size,
                createdAt: data.createdAt.toDate(),
                lastEdited: data.lastEdited.toDate(),
                lastExported: data.lastExported ? data.lastExported.toDate() : undefined,
            };
            setTable(tableData);
        } else {
            setError("Table not found or was deleted.");
        }
        setIsLoading(false);
    }, (err) => {
        console.error("Error with real-time listener:", err);
        setError("An error occurred listening for table updates.");
        setIsLoading(false);
    });

    return () => unsub();
  }, [user, tableId]);

  const handleCellClick = (row: Record<string, any>, column: ColumnDef) => {
    setEditingCell({ rowId: row.__id, columnValue: column.value });
    setCellEditValue(row[column.value] ?? '');
  };

  const handleCellUpdate = async () => {
    if (!editingCell || !user || !table || !parsedPreset) return;

    const { rowId, columnValue } = editingCell;
    const columnDef = parsedPreset.columns.find(c => c.value === columnValue);
    let finalValue = cellEditValue;

    if (columnDef?.type === 'number') {
      finalValue = Number(finalValue);
    } else if (columnDef?.type === 'boolean') {
      finalValue = Boolean(finalValue);
    }

    const updatedData = table.data.map(row => {
      if (row.__id === rowId) {
        return { ...row, [columnValue]: finalValue };
      }
      return row;
    });

    const tableRef = doc(db, 'users', user.uid, 'tables', tableId);
    const userRef = doc(db, 'users', user.uid);

    try {
        const oldSize = table.size || 0;
        const newSize = JSON.stringify(updatedData).length;
        const sizeDelta = newSize - oldSize;
        
        if (sizeDelta > 0 && user.planDetails.storageLimit !== -1) {
            const availableStorage = user.planDetails.storageLimit - user.storageUsed;
            if (availableStorage < sizeDelta) {
                toast({ variant: 'destructive', title: 'Storage Limit Exceeded', description: `This change would exceed your storage limit.`});
                setEditingCell(null);
                setCellEditValue(null);
                return;
            }
        }

        const batch = writeBatch(db);
        batch.update(tableRef, {
            data: updatedData,
            size: newSize,
            lastEdited: serverTimestamp(),
        });
        batch.update(userRef, { storageUsed: increment(sizeDelta) });
        await batch.commit();
    } catch (err) {
      console.error("Error updating cell:", err);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save the change.' });
    } finally {
      setEditingCell(null);
      setCellEditValue(null);
    }
  };


  const handleAddRow = async () => {
    if (!user || !tableId || !table || !parsedPreset) return;

    if (user.planDetails.creditLimit !== -1) {
        const creditsRemaining = user.planDetails.creditLimit - user.creditsUsed;
        if (creditsRemaining < 1) {
            toast({
                variant: 'destructive',
                title: 'Insufficient Credits',
                description: `You need 1 credit to add a new row, but you have ${creditsRemaining}. Please upgrade your plan.`,
            });
            return;
        }
    }

    const newRowSize = JSON.stringify(newRowData).length;
    if (user.planDetails.storageLimit !== -1) {
        const availableStorage = user.planDetails.storageLimit - user.storageUsed;
        if (availableStorage < newRowSize) {
            toast({ variant: 'destructive', title: 'Storage Limit Exceeded', description: `Adding this row would exceed your storage limit.`});
            return;
        }
    }

    setIsSubmitting(true);
    try {
      const newRowWithId = { ...newRowData, __id: crypto.randomUUID() };
      
      const tableRef = doc(db, 'users', user.uid, 'tables', tableId);
      const userRef = doc(db, 'users', user.uid);
      
      const newData = [...(table.data || []), newRowWithId];
      const oldSize = table.size || 0;
      const newSize = JSON.stringify(newData).length;
      const sizeDelta = newSize - oldSize;
      
      const batch = writeBatch(db);
      batch.update(tableRef, {
        data: newData,
        size: newSize,
        lastEdited: serverTimestamp(),
      });
      batch.update(userRef, { 
          storageUsed: increment(sizeDelta),
          creditsUsed: increment(1)
      });
      await batch.commit();
      
      setNewRowData({});
      toast({ title: "Row added!", description: "The new row has been saved. 1 credit was used." });

    } catch (err) {
      console.error("Error adding row:", err);
      toast({ variant: "destructive", title: "Error", description: "Could not add the row." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRow = async () => {
    if (!user || !tableId || !rowToDelete || !table) return;
    
    try {
      const tableRef = doc(db, 'users', user.uid, 'tables', tableId);
      const userRef = doc(db, 'users', user.uid);

      const newData = table.data.filter(row => row.__id !== rowToDelete.__id);
      const oldSize = table.size || 0;
      const newSize = JSON.stringify(newData).length;
      const sizeDelta = newSize - oldSize;

      const batch = writeBatch(db);
      batch.update(tableRef, {
        data: newData,
        size: newSize,
        lastEdited: serverTimestamp(),
      });
      batch.update(userRef, { storageUsed: increment(sizeDelta) });
      await batch.commit();

      toast({ title: "Row deleted.", description: "The row has been removed." });

    } catch(err) {
       console.error("Error deleting row:", err);
       toast({ variant: "destructive", title: "Error", description: "Could not delete the row." });
    } finally {
      setRowToDelete(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push('/tables')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go back to My Tables
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!table || !parsedPreset || !user) return null;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.push('/tables')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to Tables</span>
            </Button>
            <div className="flex items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                            <span className="sr-only">Table Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={handleExportClick}>
                           <Download className="mr-2 h-4 w-4" />
                           <span>Export</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsShareDialogOpen(true)}>
                            <Share2 className="mr-2 h-4 w-4" />
                            <span>Share</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{table.name}</CardTitle>
            <CardDescription>
              Click any cell to edit its content. Changes are saved automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    {parsedPreset.columns.map(col => <TableHead key={col.value}>{col.name}</TableHead>)}
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(table.data || []).map((row, rowIndex) => (
                    <TableRow key={row.__id || rowIndex}>
                       {parsedPreset.columns.map(col => (
                         <TableCell key={col.value} className="break-all" onClick={() => handleCellClick(row, col)}>
                            {editingCell?.rowId === row.__id && editingCell?.columnValue === col.value ? (
                                <InputField
                                    column={col}
                                    value={cellEditValue}
                                    onChange={(val) => setCellEditValue(val)}
                                    onBlur={handleCellUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate()}
                                />
                            ) : (
                                typeof row[col.value] === 'boolean' ? <Checkbox checked={row[col.value]} disabled /> : <span className="block min-h-[2.5rem] py-2 break-words">{String(row[col.value] ?? '')}</span>
                            )}
                         </TableCell>
                       ))}
                       <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => setRowToDelete(row)}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                 {(table.data || []).length === 0 && (
                    <TableCaption>No data yet. Add your first row below.</TableCaption>
                 )}
              </Table>
            </div>

            <div className="grid gap-4 md:hidden">
              {(table.data || []).map((row, rowIndex) => (
                <Card key={row.__id || rowIndex}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">Row {rowIndex + 1}</CardTitle>
                     <Button variant="ghost" size="icon" onClick={() => setRowToDelete(row)}>
                       <Trash2 className="h-4 w-4 text-destructive" />
                     </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parsedPreset.columns.map(col => (
                       <div key={col.value} className="flex flex-col border-t pt-2 text-sm" onClick={() => handleCellClick(row, col)}>
                         <p className="font-medium text-muted-foreground">{col.name}</p>
                          <div className="mt-1 break-all">
                           {editingCell?.rowId === row.__id && editingCell?.columnValue === col.value ? (
                                <InputField
                                    column={col}
                                    value={cellEditValue}
                                    onChange={(val) => setCellEditValue(val)}
                                    onBlur={handleCellUpdate}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCellUpdate()}
                                />
                            ) : (
                                typeof row[col.value] === 'boolean' ? <Checkbox checked={!!row[col.value]} disabled /> : <span className="block min-h-[2.5rem] py-2 break-words">{String(row[col.value] ?? '')}</span>
                            )}
                         </div>
                       </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
               {(table.data || []).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No data yet. Add your first row below.
                </p>
              )}
            </div>

          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Add New Row</CardTitle>
                <CardDescription>Fill out the fields to add an entry. Each new row costs 1 credit.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parsedPreset.columns.map(col => (
                    <div key={col.value} className="space-y-2">
                        <Label htmlFor={`new-${col.value}`}>{col.name}</Label>
                        <InputField 
                            column={col}
                            value={newRowData[col.value]}
                            onChange={(value) => setNewRowData(prev => ({ ...prev, [col.value]: value }))}
                        />
                    </div>
                ))}
            </CardContent>
            <CardFooter>
                 <Button onClick={handleAddRow} disabled={isSubmitting} className="ml-auto">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add Row (1 Credit)
                </Button>
            </CardFooter>
        </Card>

        <AIToolsForm table={table} parsedPreset={parsedPreset} />

      </div>

      <ShareDialog isOpen={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} table={table} user={user} />

      <AlertDialog open={!!rowToDelete} onOpenChange={(isOpen) => !isOpen && setRowToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this row from your table. Credits for this row will not be refunded.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRowToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={handleDeleteRow}
                >
                    Delete Row
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    