'use server';

/**
 * @fileOverview An AI flow for populating empty columns in a table based on a user prompt.
 *
 * - populateColumns - A function that takes table data and instructions and returns updated data.
 * - PopulateColumnsInput - The input type for the populateColumns function.
 * - PopulateColumnsOutput - The return type for the populateColumns function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PopulateColumnsInputSchema = z.object({
  tableData: z.array(z.record(z.any())).describe('The current data in the table as an array of objects.'),
  presetString: z.string().describe('The preset string that defines the table structure.'),
  columnsToPopulate: z.array(z.string()).describe('An array of column keys (values) that need to be populated.'),
  userPrompt: z.string().describe('The user\'s instructions for how to populate the empty columns.'),
});
export type PopulateColumnsInput = z.infer<typeof PopulateColumnsInputSchema>;

const PopulateColumnsOutputSchema = z.object({
  updatedData: z.array(z.record(z.any())).describe('The full table data with the specified columns populated.'),
});
export type PopulateColumnsOutput = z.infer<typeof PopulateColumnsOutputSchema>;

const populationPrompt = ai.definePrompt({
  name: 'populateColumnsPrompt',
  model: 'googleai/gemini-1.5-flash',
  input: { schema: PopulateColumnsInputSchema },
  output: { schema: PopulateColumnsOutputSchema },
  system: `You are an intelligent data completion assistant. Your task is to populate empty or null values in specific columns of a given dataset based on a user's instructions.

You will be given:
1. The entire table data as a JSON array of objects.
2. The table's structure definition (preset string).
3. A list of columns that you need to fill.
4. A user prompt explaining the logic for filling the columns.

Iterate through each object in the \`tableData\` array. For each object, check the columns listed in \`columnsToPopulate\`. If the value for a column is missing, null, or an empty string, generate a new value for it based on the user's prompt and the existing data in OTHER columns of that same object.

Do not modify existing data in any column. Only fill in the empty ones for the specified columns. Do not add new rows or remove existing ones.

Return the entire, updated dataset as a single JSON object conforming to the output schema, with the key "updatedData".

---
**Table Structure (Preset):**
\`\`\`
{{{presetString}}}
\`\`\`

**User Prompt:**
\`\`\`
{{{userPrompt}}}
\`\`\`

**Columns to Populate:**
{{#each columnsToPopulate}}- {{{this}}}{{/each}}

**Current Table Data:**
\`\`\`json
{{{json tableData}}}
\`\`\`
---

Now, generate the updated data.`,
});

const populateColumnsFlow = ai.defineFlow(
  {
    name: 'populateColumnsFlow',
    inputSchema: PopulateColumnsInputSchema,
    outputSchema: PopulateColumnsOutputSchema,
  },
  async (input) => {
    const { output } = await populationPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid output.");
    }
    return output;
  }
);

export async function populateColumns(input: PopulateColumnsInput): Promise<PopulateColumnsOutput> {
    const output = await populateColumnsFlow(input);
    if (!output) {
        throw new Error("The AI model did not return a valid output.");
    }
    return output;
}
