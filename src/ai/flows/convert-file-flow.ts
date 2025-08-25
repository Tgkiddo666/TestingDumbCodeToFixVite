'use server';

/**
 * @fileOverview An AI flow for converting unstructured text data into a structured format.
 *
 * - convertFile - A function that takes file content and a prompt and returns structured data.
 * - ConvertFileInput - The input type for the convertFile function.
 * - ConvertFileOutput - The return type for the convertFile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConvertFileInputSchema = z.object({
  fileContent: z.string().describe('The raw text content of the file to be converted.'),
  userPrompt: z
    .string()
    .describe(
      'A prompt from the user explaining the desired output format and structure.'
    ),
});
export type ConvertFileInput = z.infer<typeof ConvertFileInputSchema>;

const ConvertFileOutputSchema = z.object({
  convertedContent: z
    .string()
    .describe('The full text of the converted, structured file.'),
  fileName: z
    .string()
    .describe(
      'The recommended filename for the converted file, including the correct file extension based on the user prompt.'
    ),
});
export type ConvertFileOutput = z.infer<typeof ConvertFileOutputSchema>;

const conversionPrompt = ai.definePrompt({
  name: 'convertFilePrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: ConvertFileInputSchema },
  output: { schema: ConvertFileOutputSchema },
  prompt: `You are an expert data conversion engine. Your task is to transform unstructured or semi-structured text data into a well-structured format based on a user's instructions.

You will be given the raw content of a file and a user prompt explaining the desired output.

First, analyze the structure of the input file to understand the data patterns.
File Content:
\`\`\`
{{{fileContent}}}
\`\`\`

Next, carefully analyze the user's instructions for the conversion.
User Instructions:
\`\`\`
{{{userPrompt}}}
\`\`\`

Based on both the file content and the user's instructions, perform the conversion.
- Determine the correct file extension for the output from the user's prompt (e.g., .jsonl, .csv, .md).
- Create a suitable filename with that extension.
- Transform the raw data into the structured format requested by the user.

Your final output MUST be a valid JSON object that strictly adheres to the output schema, with two keys: "convertedContent" (containing the full text of the newly structured file) and "fileName". Do not include any extra commentary or explanation in your response.`,
});

const convertFileFlow = ai.defineFlow(
  {
    name: 'convertFileFlow',
    inputSchema: ConvertFileInputSchema,
    outputSchema: ConvertFileOutputSchema,
  },
  async (input) => {
    const { output } = await conversionPrompt(input);
    if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);

export async function convertFile(input: ConvertFileInput): Promise<ConvertFileOutput> {
    const output = await convertFileFlow(input);
     if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
}
