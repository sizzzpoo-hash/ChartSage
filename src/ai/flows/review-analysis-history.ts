'use server';

/**
 * @fileOverview AI flow for reviewing the analysis history of crypto charts.
 *
 * - reviewAnalysisHistory - A function that retrieves and formats the analysis history.
 * - ReviewAnalysisHistoryInput - The input type for the reviewAnalysisHistory function.
 * - ReviewAnalysisHistoryOutput - The return type for the reviewAnalysisHistory function.
 */

import {ai} from '@/ai/genkit';
import { getAnalysisHistory } from '@/lib/firestore';
import {z} from 'genkit';

const ReviewAnalysisHistoryInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose history is being reviewed.'),
});
export type ReviewAnalysisHistoryInput = z.infer<typeof ReviewAnalysisHistoryInputSchema>;

const AnalysisEntrySchema = z.object({
  timestamp: z.string().describe('The timestamp of the analysis.'),
  chartName: z.string().describe('The name or identifier of the chart analyzed.'),
  analysisSummary: z.string().describe('A summary of the AI analysis.'),
  tradeSignal: z.string().describe('The generated trade signal.'),
});

const ReviewAnalysisHistoryOutputSchema = z.array(AnalysisEntrySchema).describe('An array of analysis history entries.');
export type ReviewAnalysisHistoryOutput = z.infer<typeof ReviewAnalysisHistoryOutputSchema>;

export async function reviewAnalysisHistory(input: ReviewAnalysisHistoryInput): Promise<ReviewAnalysisHistoryOutput> {
  return reviewAnalysisHistoryFlow(input);
}

const reviewAnalysisHistoryFlow = ai.defineFlow({
    name: 'reviewAnalysisHistoryFlow',
    inputSchema: ReviewAnalysisHistoryInputSchema,
    outputSchema: ReviewAnalysisHistoryOutputSchema,
  },
  async ({ userId }) => {
    const history = await getAnalysisHistory(userId);
    return history;
  }
);
