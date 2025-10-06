// src/ai/flows/generate-kpi-dashboard.ts
'use server';

/**
 * @fileOverview An AI agent for generating logistical advice based on open interventions.
 *
 * - generateKpiDashboard - A function that generates a logistical advice.
 * - GenerateKpiDashboardInput - The input type for the generateKpiDashboard function.
 * - GenerateKpiDashboardOutput - The return type for the generateKpiDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OpenInterventionWithLocationSchema = z.object({
  id: z.string(),
  title: z.string(),
  clientName: z.string(),
  clientAddress: z.string(),
});

const GenerateKpiDashboardInputSchema = z.object({
  openInterventionsWithLocation: z.array(OpenInterventionWithLocationSchema).describe('List of open interventions with client location details.'),
});
export type GenerateKpiDashboardInput = z.infer<typeof GenerateKpiDashboardInputSchema>;

const GenerateKpiDashboardOutputSchema = z.object({
  dashboardDescription: z.string().describe('A description with logistical advice if any clusters of interventions are found.'),
});
export type GenerateKpiDashboardOutput = z.infer<typeof GenerateKpiDashboardOutputSchema>;

export async function generateKpiDashboard(input: GenerateKpiDashboardInput): Promise<GenerateKpiDashboardOutput> {
  // If there are no interventions with addresses, no need to call the AI.
  if (!input.openInterventionsWithLocation || input.openInterventionsWithLocation.length === 0) {
    return { dashboardDescription: "Nessun raggruppamento di interventi possibile in base agli indirizzi disponibili." };
  }
  return generateKpiDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateKpiDashboardPrompt',
  input: {schema: GenerateKpiDashboardInputSchema},
  output: {schema: GenerateKpiDashboardOutputSchema},
  prompt: `You are an expert logistical advisor. Your task is to analyze a list of open interventions and their client addresses to find opportunities for route optimization.

You have the following list of open interventions:
{{#each openInterventionsWithLocation}}
  - Intervento per '{{clientName}}' a '{{clientAddress}}'
{{/each}}

Your task:
1.  **Analyze the addresses**: Identify if any of the interventions are in the same city or are very close to each other.
2.  **Provide logistical advice**:
    - If you find a cluster of 2 or more interventions, respond with a section titled "Consiglio Logistico".
    - In this section, suggest grouping these interventions to save time and travel costs. For example: "Consiglio Logistico: Gli interventi per 'Cliente A' e 'Cliente B' sono entrambi a Milano. Si consiglia di pianificarli insieme per ottimizzare il percorso."
    - If there are no interventions that can be grouped, respond with "Nessun raggruppamento di interventi possibile in base agli indirizzi disponibili."
3.  Your response must be concise and only contain the logistical advice. Do not provide any other analysis.
`,
});

const generateKpiDashboardFlow = ai.defineFlow(
  {
    name: 'generateKpiDashboardFlow',
    inputSchema: GenerateKpiDashboardInputSchema,
    outputSchema: GenerateKpiDashboardOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
