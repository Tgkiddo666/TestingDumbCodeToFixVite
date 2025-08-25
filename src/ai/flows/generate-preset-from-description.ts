
'use server';

/**
 * @fileOverview Generates a table preset from a user-provided description of the desired data structure.
 *
 * - generatePresetFromDescription - A function that takes a description and returns a table preset.
 * - GeneratePresetFromDescriptionInput - The input type for the generatePresetFromDescription function.
 * - GeneratePresetFromDescriptionOutput - The return type for the generatePresetFromDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePresetFromDescriptionInputSchema = z.object({
  description: z.string().describe('A description of the desired table structure and export format.'),
});
export type GeneratePresetFromDescriptionInput = z.infer<typeof GeneratePresetFromDescriptionInputSchema>;

const GeneratePresetFromDescriptionOutputSchema = z.object({
  preset: z.string().describe('A string representation of the generated table preset.'),
});
export type GeneratePresetFromDescriptionOutput = z.infer<typeof GeneratePresetFromDescriptionOutputSchema>;

export async function generatePresetFromDescription(input: GeneratePresetFromDescriptionInput): Promise<GeneratePresetFromDescriptionOutput> {
  const output = await generatePresetFromDescriptionFlow(input);
  if (!output) {
    throw new Error("The AI model did not return a valid output.");
  }
  return output;
}

const prompt = ai.definePrompt({
  name: 'generatePresetFromDescriptionPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: {schema: GeneratePresetFromDescriptionInputSchema},
  output: {schema: GeneratePresetFromDescriptionOutputSchema},
  prompt: `You are an expert at generating table presets based on user descriptions.

  Given the following description of the desired table structure and export format, generate a table preset.

  Description: {{{description}}}

  The table preset should be a string that conforms to the following format:
  
  [TABLE(EXPORT-AS:<file_extension>)(WRITE-AS:<template_string>):[
   {"name":"Column Name 1", "value":"column1", "type":"text", "important":"no", "write":"ID1"},
   {"name":"Column Name 2", "value":"column2", "type":"number", "important":"yes", "write":"ID2"}
  ]]
  
  Remember to replace <file_extension> with the appropriate file extension (e.g., .jsonl, .json, .txt).
  Replace <template_string> with the desired template for exporting each row.
  The part after the colon MUST be a valid JSON array, enclosed in square brackets [].
  Each column definition within the array should be a JSON object with a "name", "value", "type", "important", and "write" field.
  The "write" field should correspond to the IDs used in the <template_string>.
  The type field determines the type of value saved in that column, it should be a reasonable value such as json, number, text or boolean.
  Type should be boolean for a checkbox.
  The "important" field determines whether that column is required to export the record, it can be either yes or no.
  Don't add any additional commentary or explanation in your response, just the preset itself as described.
  `,
});

const generatePresetFromDescriptionFlow = ai.defineFlow(
  {
    name: 'generatePresetFromDescriptionFlow',
    inputSchema: GeneratePresetFromDescriptionInputSchema,
    outputSchema: GeneratePresetFromDescriptionOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);
