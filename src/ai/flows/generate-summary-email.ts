'use server';
/**
 * @fileOverview An AI agent for generating a summary email of expiring interventions.
 *
 * - generateSummaryEmail - A function that generates the email content.
 * - GenerateSummaryEmailInput - The input type for the function.
 * - GenerateSummaryEmailOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const InterventionInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  clientName: z.string(),
  dueDate: z.string(),
  priority: z.string(),
  operatorName: z.string().optional().nullable(),
});

const GenerateSummaryEmailInputSchema = z.object({
  interventions: z.array(InterventionInfoSchema),
  companyName: z.string(),
});
export type GenerateSummaryEmailInput = z.infer<typeof GenerateSummaryEmailInputSchema>;

const GenerateSummaryEmailOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type GenerateSummaryEmailOutput = z.infer<typeof GenerateSummaryEmailOutputSchema>;


export async function generateSummaryEmail(input: GenerateSummaryEmailInput): Promise<GenerateSummaryEmailOutput> {
  if (input.interventions.length === 0) {
    return {
        subject: `Nessun intervento in scadenza per ${input.companyName}`,
        body: `<p>Oggi non ci sono interventi in scadenza nei prossimi 2 giorni.</p>`
    }
  }
  return generateSummaryEmailFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateSummaryEmailPrompt',
  input: {schema: GenerateSummaryEmailInputSchema},
  output: {schema: GenerateSummaryEmailOutputSchema},
  prompt: `Sei un assistente AI per MannaTic, un software di gestione degli interventi. Il tuo compito è generare il contenuto (soggetto e corpo HTML) di un'email di riepilogo per gli interventi in scadenza. L'email è destinata agli operatori.

**Nome Azienda:** {{{companyName}}}

**Elenco Interventi in Scadenza:**
{{#each interventions}}
- ID: {{id}}
  Titolo: "{{title}}"
  Cliente: {{clientName}}
  Scadenza: {{dueDate}}
  Priorità: {{priority}}
  Operatore: {{#if operatorName}}{{operatorName}}{{else}}Non Assegnato{{/if}}
{{/each}}

**Tuo Compito:**
Genera un'email in italiano, chiara e professionale, con le seguenti caratteristiche:
1.  **Soggetto (subject):** Deve essere conciso e informativo, ad esempio: "Riepilogo Interventi in Scadenza - MannaTic per {{{companyName}}}"
2.  **Corpo (body):**
    *   Deve essere in formato HTML.
    *   Usa uno stile pulito e leggibile, con un saluto generico (es. "Ciao team,").
    *   Includi un'introduzione che spiega lo scopo dell'email (es. "Ecco un riepilogo degli interventi che richiedono attenzione nei prossimi giorni.").
    *   Presenta gli interventi in una tabella HTML con le seguenti colonne: "ID Intervento", "Titolo e Cliente", "Scadenza", "Priorità", "Operatore Assegnato".
    *   Per ogni intervento, formatta la data di scadenza in modo leggibile (es. "dd/MM/yyyy HH:mm").
    *   Termina con un saluto professionale (es. "Buon lavoro, Il Team di MannaTic").

Assicurati che l'HTML sia ben formattato e pronto per essere inviato.
`,
});

const generateSummaryEmailFlow = ai.defineFlow(
  {
    name: 'generateSummaryEmailFlow',
    inputSchema: GenerateSummaryEmailInputSchema,
    outputSchema: GenerateSummaryEmailOutputSchema,
  },
  async (input) => {
    const formattedInterventions = input.interventions.map(i => ({
        ...i,
        dueDate: format(new Date(i.dueDate), 'dd/MM/yyyy HH:mm', { locale: it })
    }));

    const {output} = await prompt({ ...input, interventions: formattedInterventions });
    return output!;
  }
);
