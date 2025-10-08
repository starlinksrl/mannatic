// src/ai/flows/generate-kpi-dashboard.ts
'use server';

/**
 * @fileOverview An AI agent for generating a comprehensive analysis of the dashboard KPIs.
 *
 * - generateKpiDashboard - A function that generates an analysis.
 * - GenerateKpiDashboardInput - The input type for the generateKpiDashboard function.
 * - GenerateKpiDashboardOutput - The return type for the generateKpiDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InterventionInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  clientName: z.string(),
  priority: z.string(),
  status: z.string(),
  dueDate: z.string().optional().nullable(),
});

const OperatorWorkloadSchema = z.object({
  name: z.string(),
  workload: z.number(),
});

const GenerateKpiDashboardInputSchema = z.object({
  openInterventions: z.number().describe('Number of currently open interventions.'),
  closedInterventions: z.number().describe('Number of interventions closed in the last 30 days.'),
  slaAdherencePercentage: z.number().describe('Percentage of interventions meeting their SLA (due date).'),
  overdueMaintenanceTasks: z.number().describe('Number of scheduled maintenance tasks that are past their due date.'),
  operatorWorkloadData: z.array(OperatorWorkloadSchema).describe('Workload for each operator (number of open interventions).'),
  highPriorityInterventions: z.array(InterventionInfoSchema).describe('List of high or critical priority open interventions.'),
});
export type GenerateKpiDashboardInput = z.infer<typeof GenerateKpiDashboardInputSchema>;

const GenerateKpiDashboardOutputSchema = z.object({
  dashboardDescription: z.string().describe('A comprehensive analysis of the provided dashboard data.'),
});
export type GenerateKpiDashboardOutput = z.infer<typeof GenerateKpiDashboardOutputSchema>;

export async function generateKpiDashboard(input: GenerateKpiDashboardInput): Promise<GenerateKpiDashboardOutput> {
  // If there's no data, no need to call the AI.
  if (input.openInterventions === 0 && input.closedInterventions === 0) {
    return { dashboardDescription: "Non ci sono abbastanza dati per generare un'analisi." };
  }
  return generateKpiDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateKpiDashboardPrompt',
  input: {schema: GenerateKpiDashboardInputSchema},
  output: {schema: GenerateKpiDashboardOutputSchema},
  prompt: `Sei un assistente AI per MannaTic, un software di gestione degli interventi di manutenzione. Il tuo compito è analizzare i seguenti dati della dashboard e fornire un riepilogo conciso, intelligente e utile per un manager.

**Dati Attuali della Dashboard:**
- Interventi Aperti: {{{openInterventions}}}
- Interventi Chiusi (ultimi 30gg): {{{closedInterventions}}}
- Aderenza SLA: {{{slaAdherencePercentage}}}%
- Manutenzioni Scadute: {{{overdueMaintenanceTasks}}}
- Carico Operatori:
{{#each operatorWorkloadData}}
  - {{name}}: {{workload}} intervent{{#if (eq workload 1)}}o{{else}}i{{/if}}
{{/each}}
- Interventi ad Alta Priorità:
{{#if highPriorityInterventions}}
{{#each highPriorityInterventions}}
  - "{{title}}" per {{clientName}} (Priorità: {{priority}})
{{/each}}
{{else}}
  Nessuno
{{/if}}

**Tuo Compito:**
Analizza i dati e genera una descrizione in italiano da mostrare nella dashboard. La risposta deve essere strutturata in 3 sezioni, usando Markdown per la formattazione con grassetto per i titoli:

1.  **Panoramica**: Fornisci un riassunto generale di 1-2 frasi. (Es: "La situazione è sotto controllo, con un buon numero di interventi chiusi e un'ottima aderenza SLA.")
2.  **Punti di Attenzione**: Elenca 1-3 punti critici o aree di rischio basate sui dati. Sii specifico. Se non ci sono punti critici, scrivi "Nessun punto di attenzione particolare al momento.".
    - Esempi: menziona se l'aderenza SLA è bassa, se ci sono manutenzioni scadute, se il carico di lavoro degli operatori è sbilanciato, o se ci sono troppi interventi critici aperti.
3.  **Consigli**: Fornisci 1-2 consigli pratici e brevi per affrontare i punti di attenzione. Se non ci sono punti di attenzione, scrivi "Continuate così!".
    - Esempi: "Considerare di riassegnare l'intervento X per bilanciare il carico." o "Pianificare le manutenzioni scadute per evitare problemi futuri."

**Stile:**
- Sii conciso e vai dritto al punto.
- Usa un tono professionale ma incoraggiante.
- Non ripetere semplicemente i numeri, ma interpretali.
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
