'use server';

/**
 * @fileOverview An AI agent for suggesting intervention titles.
 *
 * - suggestInterventionTitle - A function that suggests intervention titles based on user input and past titles.
 * - SuggestInterventionTitleInput - The input type for the suggestInterventionTitle function.
 * - SuggestInterventionTitleOutput - The return type for the suggestInterventionTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInterventionTitleInputSchema = z.object({
  userInput: z.string().describe('The partial title typed by the user.'),
  existingTitles: z.array(z.string()).describe('A list of past intervention titles for the company.'),
});
export type SuggestInterventionTitleInput = z.infer<typeof SuggestInterventionTitleInputSchema>;

const SuggestInterventionTitleOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of 3-5 concise title suggestions.'),
});
export type SuggestInterventionTitleOutput = z.infer<typeof SuggestInterventionTitleOutputSchema>;


export async function suggestInterventionTitle(input: SuggestInterventionTitleInput): Promise<SuggestInterventionTitleOutput> {
  return suggestInterventionTitleFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestInterventionTitlePrompt',
  input: {schema: SuggestInterventionTitleInputSchema},
  output: {schema: SuggestInterventionTitleOutputSchema},
  prompt: `You are an AI assistant that helps users fill out forms by suggesting autocompletions for an intervention title.
You will be given the user's partial input and a list of historical intervention titles from their company.
Based on this, provide 3 to 5 concise and relevant suggestions. Prioritize suggestions that complete the user's input.
If the input is empty or very short, suggest common intervention types.

User Input: "{{userInput}}"

Historical Titles:
{{#each existingTitles}}
- {{{this}}}
{{/each}}
`,
});

const suggestInterventionTitleFlow = ai.defineFlow(
  {
    name: 'suggestInterventionTitleFlow',
    inputSchema: SuggestInterventionTitleInputSchema,
    outputSchema: SuggestInterventionTitleOutputSchema,
  },
  async (input) => {
    // If user input is empty, don't call the AI.
    if (!input.userInput.trim()) {
        return { suggestions: [] };
    }

    const {output} = await prompt(input);
    return output!;
  }
);
