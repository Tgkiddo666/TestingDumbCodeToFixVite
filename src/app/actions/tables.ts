'use server';

import { populateColumns } from '@/ai/flows/populate-columns-flow';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const formSchema = z.object({
  tableId: z.string(),
  userId: z.string(),
  prompt: z.string().min(10, 'Prompt must be at least 10 characters.'),
  columns: z.array(z.string()).min(1, 'You must select at least one column.'),
});

type State = {
    error?: string;
    success?: boolean;
};

export async function populateTableColumns(
  prevState: any,
  formData: FormData
): Promise<State> {
    const userId = formData.get('userId') as string;
    const tableId = formData.get('tableId') as string;
    const prompt = formData.get('prompt') as string;
    const columns = formData.getAll('columns') as string[];

    const validatedFields = formSchema.safeParse({ userId, tableId, prompt, columns });

    if (!validatedFields.success) {
        return { error: 'Invalid input. Please check your prompt and column selection.' };
    }

    try {
        const tableRef = doc(db, 'users', userId, 'tables', tableId);
        const tableSnap = await getDoc(tableRef);

        if (!tableSnap.exists()) {
            return { error: 'Table not found.' };
        }
        const tableData = tableSnap.data();
        
        // Don't process if there's no data
        if (!tableData.data || tableData.data.length === 0) {
            return { error: 'There is no data in the table to process.' };
        }

        const result = await populateColumns({
            tableData: tableData.data,
            presetString: tableData.presetString,
            columnsToPopulate: columns,
            userPrompt: prompt,
        });

        await updateDoc(tableRef, {
            data: result.updatedData,
            lastEdited: serverTimestamp(),
        });
        
        revalidatePath(`/tables/${tableId}`);
        return { success: true };

    } catch (err: any) {
        console.error('AI column population failed:', err);
        return { error: err.message || 'An unknown error occurred during AI completion.' };
    }
}
