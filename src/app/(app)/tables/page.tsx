
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, writeBatch, increment } from "firebase/firestore";
import type { Table as TableType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  MoreHorizontal,
  PlusCircle,
  FileJson,
  Trash2,
  Download,
  Loader2,
  Pencil,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


function RenameTableDialog({ table, isOpen, onOpenChange }: { table: TableType, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [newName, setNewName] = useState(table.name);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewName(table.name);
        }
    }, [isOpen, table.name]);

    const handleSave = async () => {
        if (!user || !newName.trim() || newName === table.name) {
            onOpenChange(false);
            return;
        }

        setIsSaving(true);
        try {
            const tableRef = doc(db, 'users', user.uid, 'tables', table.id);
            await updateDoc(tableRef, { name: newName });
            toast({
                title: "Table Renamed",
                description: `Successfully renamed to "${newName}".`,
            });
            onOpenChange(false);
        } catch (error) {
            console.error("Error renaming table:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not rename the table." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Table</DialogTitle>
                    <DialogDescription>
                        Enter a new name for your table "{table.name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="tableName" className="sr-only">Table Name</Label>
                    <Input
                        id="tableName"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new table name"
                    />
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !newName.trim()}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function TablesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [tables, setTables] = useState<TableType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableType | null>(null);
  const [renameTarget, setRenameTarget] = useState<TableType | null>(null);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const tablesCol = collection(db, 'users', user.uid, 'tables');
    const q = query(tablesCol, orderBy("lastEdited", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tablesData = snapshot.docs
      .filter(doc => doc.data().createdAt && doc.data().lastEdited)
      .map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            fileType: data.fileType,
            presetString: data.presetString,
            tags: data.tags,
            data: data.data,
            size: data.size,
            createdAt: data.createdAt.toDate(),
            lastEdited: data.lastEdited.toDate(),
            lastExported: data.lastExported ? data.lastExported.toDate() : undefined,
        } as TableType;
      });
      setTables(tablesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tables: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch your tables.",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  const handleDelete = async () => {
    if (!user || !tableToDelete) return;
    try {
      const batch = writeBatch(db);
      
      const tableRef = doc(db, 'users', user.uid, 'tables', tableToDelete.id);
      batch.delete(tableRef);

      const sizeToDeduct = tableToDelete.size || 0;
      if (sizeToDeduct > 0) {
        const userRef = doc(db, 'users', user.uid);
        batch.update(userRef, { storageUsed: increment(-sizeToDeduct) });
      }

      await batch.commit();

      toast({
        title: "Table Deleted",
        description: `"${tableToDelete.name}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error("Error deleting table:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the table.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  const openDeleteDialog = (table: TableType) => {
    setTableToDelete(table);
    setIsDeleteDialogOpen(true);
  };

  const openRenameDialog = (table: TableType) => {
    setRenameTarget(table);
  };


  const hasTables = tables.length > 0;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : hasTables ? (
          <div>
            <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
              <div>
                <CardTitle>My Tables</CardTitle>
                <CardDescription>
                  Manage your data tables and export them.
                </CardDescription>
              </div>
              <Link href="/tables/new">
                  <Button className="hidden md:flex">
                      <PlusCircle className="mr-2 h-4 w-4" /> New Table
                  </Button>
              </Link>
            </CardHeader>
            {/* Desktop View */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>Last Edited</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.id}>
                        <TableCell className="font-medium">
                          <Link href={`/tables/${table.id}`} className="flex items-center gap-2 hover:underline">
                              <FileJson className="h-5 w-5 text-primary" />
                              {table.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{table.fileType}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(table.lastEdited)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => router.push(`/tables/${table.id}`)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Open
                              </DropdownMenuItem>
                               <DropdownMenuItem onSelect={() => openRenameDialog(table)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => router.push(`/tables/${table.id}`)}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onSelect={() => openDeleteDialog(table)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            {/* Mobile View */}
            <div className="grid gap-4 md:hidden">
              {tables.map(table => (
                 <Card key={table.id}>
                    <CardHeader>
                       <CardTitle className="flex items-center justify-between">
                         <Link href={`/tables/${table.id}`} className="flex items-center gap-2 text-base hover:underline">
                           <FileJson className="h-5 w-5 text-primary" /> {table.name}
                         </Link>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => router.push(`/tables/${table.id}`)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Open
                              </DropdownMenuItem>
                               <DropdownMenuItem onSelect={() => openRenameDialog(table)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => router.push(`/tables/${table.id}`)}>
                                <Download className="mr-2 h-4 w-4" />
                                Export
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                onSelect={() => openDeleteDialog(table)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-between text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">File Type</p>
                          <Badge variant="outline" className="mt-1">{table.fileType}</Badge>
                        </div>
                         <div>
                          <p className="font-medium text-foreground">Last Edited</p>
                          <p className="mt-1">{formatDate(table.lastEdited)}</p>
                        </div>
                    </CardContent>
                 </Card>
              ))}
            </div>
          </div>
        ) : (
          <Card className="text-center p-8 border-2 border-dashed rounded-lg">
            <CardHeader>
              <CardTitle>No tables yet!</CardTitle>
              <CardDescription>
                Create your first table to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tables/new">
                <Button size="lg">
                  <PlusCircle className="mr-2 h-4 w-4" /> New Table
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
        <Link href="/tables/new">
          <Button className="fixed bottom-20 right-4 h-14 rounded-full shadow-lg md:bottom-8 md:right-8 px-5">
            <PlusCircle className="mr-2 h-5 w-5" />
            <span className="font-semibold">New Table</span>
          </Button>
        </Link>
      </div>

      {renameTarget && (
        <RenameTableDialog 
            table={renameTarget}
            isOpen={!!renameTarget}
            onOpenChange={(isOpen) => !isOpen && setRenameTarget(null)}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    <span className="font-bold"> "{tableToDelete?.name}" </span>
                    table and all of its data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={handleDelete}
                >
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
