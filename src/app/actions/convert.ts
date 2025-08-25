'use server';

import { convertFile as convertFileFlow } from '@/ai/flows/convert-file-flow';
import type { ConvertFileOutput } from '@/ai/flows/convert-file-flow';
import { z } from 'zod';

const formSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters.'),
  file: z.instanceof(File).refine(file => file.size > 0, 'File is required.'),
});

export async function convertFile(
  prevState: any,
  formData: FormData
): Promise<{ error?: string; data?: ConvertFileOutput }> {
  try {
    const validatedFields = formSchema.safeParse({
      prompt: formData.get('prompt'),
      file: formData.get('file'),
    });

    if (!validatedFields.success) {
      return { error: 'Invalid input. Please check your file and prompt.' };
    }

    const { file, prompt } = validatedFields.data;

    const fileContent = await file.text();

    if (!fileContent) {
      return { error: 'File is empty or could not be read.' };
    }

    const result = await convertFileFlow({
      fileContent: fileContent,
      userPrompt: prompt,
    });

    return { data: result };
  } catch (err: any) {
    console.error('Conversion failed:', err);
    return { error: err.message || 'An unknown error occurred during conversion.' };
  }
}
