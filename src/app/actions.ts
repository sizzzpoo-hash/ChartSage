'use server';

import { analyzeChartAndGenerateTradeSignal } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

export async function getAiAnalysis(chartDataUri: string) {
  if (!chartDataUri) {
    return { success: false, error: 'Chart image is missing.' };
  }

  try {
    const result = await analyzeChartAndGenerateTradeSignal({ chartDataUri });
    return { success: true, data: result };
  } catch (error) {
    console.error('AI analysis failed:', error);
    // In a real app, you might want to log this error to a monitoring service
    return { success: false, error: 'The AI model failed to process the request. Please try again later.' };
  }
}
