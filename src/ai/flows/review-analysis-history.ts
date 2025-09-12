'use server';

/**
 * @fileOverview AI flow for reviewing the analysis history of crypto charts.
 *
 * - reviewAnalysisHistory - A function that retrieves and formats the analysis history with pagination.
 * - ReviewAnalysisHistoryInput - The input type for the reviewAnalysisHistory function.
 * - ReviewAnalysisHistoryOutput - The return type for the reviewAnalysisHistory function.
 */

import {ai} from '@/ai/genkit';
import { getAnalysisHistory } from '@/lib/firestore';
import {z} from 'genkit';

const ReviewAnalysisHistoryInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose history is being reviewed.'),
  limit: z.number().optional().describe('The number of records to fetch.'),
  startAfter: z.string().optional().nullable().describe('The timestamp of the last document from the previous page.'),
});
export type ReviewAnalysisHistoryInput = z.infer<typeof ReviewAnalysisHistoryInputSchema>;

const TradeSignalSchema = z.object({
  entryPriceRange: z.string(),
  takeProfitLevels: z.array(z.string()),
  stopLossLevel: z.string(),
});

const SwotSchema = z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    opportunities: z.array(z.string()),
    threats: z.array(z.string()),
});

const AnalysisEntrySchema = z.object({
  id: z.string().describe('The unique identifier for the analysis entry.'),
  timestamp: z.string().describe('The timestamp of the analysis.'),
  chartName: z.string().describe('The name or identifier of the chart analyzed.'),
  analysisSummary: z.string().describe('A summary of the AI analysis.'),
  tradeSignal: TradeSignalSchema.describe('The structured trade signal.'),
  chartDataUri: z.string().optional().describe('A snapshot of the chart at the time of analysis.'),
  swot: SwotSchema.describe('The SWOT analysis.'),
});

const ReviewAnalysisHistoryOutputSchema = z.object({
    history: z.array(AnalysisEntrySchema).describe('An array of analysis history entries for the current page.'),
});

export type ReviewAnalysisHistoryOutput = z.infer<typeof ReviewAnalysisHistoryOutputSchema>;

export async function reviewAnalysisHistory(input: ReviewAnalysisHistoryInput): Promise<ReviewAnalysisHistoryOutput> {
  return reviewAnalysisHistoryFlow(input);
}

const reviewAnalysisHistoryFlow = ai.defineFlow({
    name: 'reviewAnalysisHistoryFlow',
    inputSchema: ReviewAnalysisHistoryInputSchema,
    outputSchema: ReviewAnalysisHistoryOutputSchema,
  },
  async ({ userId, limit, startAfter }) => {
    const history = await getAnalysisHistory(userId, limit, startAfter);
    // Zod validation will happen automatically on the return value
    return { history: history as any };
  }
);
