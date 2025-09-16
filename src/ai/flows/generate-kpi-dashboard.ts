// src/ai/flows/generate-kpi-dashboard.ts
'use server';

/**
 * @fileOverview A KPI dashboard generation AI agent.
 *
 * - generateKpiDashboard - A function that generates a KPI dashboard.
 * - GenerateKpiDashboardInput - The input type for the generateKpiDashboard function.
 * - GenerateKpiDashboardOutput - The return type for the generateKpiDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateKpiDashboardInputSchema = z.object({
  openInterventions: z.number().describe('The number of open interventions.'),
  closedInterventions: z.number().describe('The number of closed interventions.'),
  slaAdherencePercentage: z
    .number()
    .describe('The percentage of interventions adhering to SLA.'),
  overdueMaintenanceTasks: z
    .number()
    .describe('The number of overdue maintenance tasks.'),
  operatorWorkload: z.record(z.string(), z.number())
    .describe('The workload of each operator. Key is operator name, value is workload score.'),
});
export type GenerateKpiDashboardInput = z.infer<typeof GenerateKpiDashboardInputSchema>;

const GenerateKpiDashboardOutputSchema = z.object({
  dashboardDescription: z.string().describe('A description of the KPI dashboard.'),
});
export type GenerateKpiDashboardOutput = z.infer<typeof GenerateKpiDashboardOutputSchema>;

export async function generateKpiDashboard(input: GenerateKpiDashboardInput): Promise<GenerateKpiDashboardOutput> {
  return generateKpiDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateKpiDashboardPrompt',
  input: {schema: GenerateKpiDashboardInputSchema},
  output: {schema: GenerateKpiDashboardOutputSchema},
  prompt: `You are an expert in data visualization and KPI dashboard creation. Based on the provided data, identify the most relevant KPIs and generate a concise dashboard description highlighting the current operational status.

  Open Interventions: {{{openInterventions}}}
  Closed Interventions: {{{closedInterventions}}}
  SLA Adherence Percentage: {{{slaAdherencePercentage}}}
  Overdue Maintenance Tasks: {{{overdueMaintenanceTasks}}}
  Operator Workload: {{{operatorWorkload}}}

  Consider the following when generating the description:
  - Prioritize KPIs that indicate potential issues or areas of improvement.
  - Highlight any significant trends or deviations from expected performance.
  - Suggest potential actions based on the identified KPIs.
  - The dashboard should provide a clear and concise overview of the current operational status, allowing administrators to quickly understand key performance indicators and make informed decisions.
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
