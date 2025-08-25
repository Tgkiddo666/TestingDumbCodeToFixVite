
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import type { Table as TableType, ParsedPreset } from '@/lib/types';
import { parsePresetString, formatDate } from '@/lib/utils';
import Link from 'next/link';

import LoadingSpinner from '@/components/loading-spinner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useParams, useRouter } from 'next/navigation';
import { Download, Sigma, ArrowLeft, Table2, User as UserIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


export default function PublicTableViewPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const userId = params.userId as string;
  const tableId = params.tableId as string;

  const [table, setTable] = useState<TableType | null>(null);
  const [author, setAuthor] = useState<{name: string, username?: string, avatarUrl?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsedPreset: ParsedPreset | null = useMemo(() => {
    if (table) return parsePresetString(table.presetString);
    return null;
  }, [table]);

  useEffect(() => {
    if (!userId || !tableId) {
      setError("Invalid link. User or Table ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchTableData = async () => {
      try {
        const tableRef = doc(db, 'users', userId, 'tables', tableId);
        const tableSnap = await getDoc(tableRef);

        if (!tableSnap.exists()) {
          setError("This table could not be found or has been deleted.");
          setIsLoading(false);
          return;
        }

        const data = tableSnap.data();
        
        if (!data.createdAt || !data.lastEdited) {
            setError("This table's data is incomplete and cannot be displayed at this time.");
            setIsLoading(false);
            return;
        }

        const tableData: TableType = {
            id: tableSnap.id,
            name: data.name,
            fileType: data.fileType,
            presetString: data.presetString,
            tags: data.tags,
            data: data.data,
            size: data.size,
            createdAt: data.createdAt.toDate(),
            lastEdited: data.lastEdited.toDate(),
            lastExported: data.lastExported ? data.lastExported.toDate() : undefined,
        };
        setTable(tableData);

        const authorRef = doc(db, 'users', userId);
        const authorSnap = await getDoc(authorRef);
        if (authorSnap.exists()) {
            const authorData = authorSnap.data();
            setAuthor({
                name: authorData.name || 'Anonymous',
                username: authorData.username,
                avatarUrl: authorData.avatarUrl
            });
        }

      } catch (err: any) {
        console.error("Error fetching public table:", err);
        // Check for permission denied, which might mean the rules aren't set correctly
        if (err.code === 'permission-denied') {
             setError("This table could not be accessed. It might be private or the owner's sharing settings may have changed.");
        } else {
             setError("An unexpected error occurred while loading this table.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTableData();
  }, [userId, tableId]);

  const handleDownload = async () => {
    if (!table || !parsedPreset) return;

    toast({ title: "Download Started", description: `Downloading ${table.name}` });
    
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

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${table.name}${parsedPreset.exportAs}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
      <div className="flex flex-col min-h-screen bg-background">
         <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between border-b">
            <Link href="/" className="flex items-center gap-2">
            <Sigma className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Data Weaver</span>
            </Link>
            <div className="flex items-center gap-4">
            <Button asChild>
                <Link href="/login">Get Started</Link>
            </Button>
            </div>
        </header>

         <main className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
            {error ? (
                 <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Cannot Display Table</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button variant="outline" onClick={() => router.push('/')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Homepage
                        </Button>
                    </CardFooter>
                </Card>
            ) : table && parsedPreset ? (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-3xl"><Table2 /> {table.name}</CardTitle>
                            {author && (
                                <CardDescription>
                                    <Link href={author.username ? `/u/${author.username}` : '#'} className="inline-flex items-center gap-2 pt-2 group">
                                         <Avatar className="h-6 w-6">
                                            <AvatarImage src={author.avatarUrl} alt={author.name} />
                                            <AvatarFallback>{author.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        Shared by <span className="font-medium text-primary group-hover:underline">{author.name}</span>
                                        {table.lastEdited && <span>· Last updated {formatDate(table.lastEdited)}</span>}
                                    </Link>
                                </CardDescription>
                            )}
                        </CardHeader>
                         <CardContent>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                    <TableRow>
                                        {parsedPreset.columns.map(col => <TableHead key={col.value}>{col.name}</TableHead>)}
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {(table.data || []).map((row, rowIndex) => (
                                        <TableRow key={row.__id || rowIndex}>
                                        {parsedPreset.columns.map(col => (
                                            <TableCell key={col.value} className="break-all">
                                                {typeof row[col.value] === 'boolean' ? <Checkbox checked={row[col.value]} disabled /> : <span>{String(row[col.value] ?? '')}</span>}
                                            </TableCell>
                                        ))}
                                        </TableRow>
                                    ))}
                                    </TableBody>
                                    {(table.data || []).length === 0 && (
                                        <TableCaption>This table is currently empty.</TableCaption>
                                    )}
                                </Table>
                            </div>

                             <div className="grid gap-4 md:hidden">
                                {(table.data || []).map((row, rowIndex) => (
                                    <Card key={row.__id || rowIndex}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Row {rowIndex + 1}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {parsedPreset.columns.map(col => (
                                        <div key={col.value} className="flex flex-col border-t pt-2 text-sm">
                                            <p className="font-medium text-muted-foreground">{col.name}</p>
                                            <div className="mt-1 break-all">
                                                {typeof row[col.value] === 'boolean' ? <Checkbox checked={!!row[col.value]} disabled /> : <span>{String(row[col.value] ?? '')}</span>}
                                            </div>
                                        </div>
                                        ))}
                                    </CardContent>
                                    </Card>
                                ))}
                                {(table.data || []).length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">This table is currently empty.</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleDownload}>
                                <Download className="mr-2 h-4 w-4" /> Download ({parsedPreset.exportAs})
                            </Button>
                        </CardFooter>
                    </Card>
                </>
            ) : (
                <LoadingSpinner />
            )}
        </main>
      </div>
  );
}
