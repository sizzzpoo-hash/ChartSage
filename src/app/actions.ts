'use server';

import { analyzeChartAndGenerateTradeSignal } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import { saveAnalysisResult } from '@/lib/firestore';
import type { OhlcvData } from '@/components/trading-chart';


export async function getAiAnalysis(
  chartDataUri: string, 
  ohlcvData: OhlcvData[],
  symbol: string,
  userId: string,
  question?: string, 
  existingAnalysis?: string
) {
  if (!chartDataUri) {
    return { success: false, error: 'Chart image is missing.' };
  }
  if (!userId) {
     return { success: false, error: 'User is not authenticated.' };
  }

  try {
    const result = await analyzeChartAndGenerateTradeSignal({ chartDataUri, ohlcvData, question, existingAnalysis });
    
    // Save the analysis result to Firestore
    await saveAnalysisResult(result, symbol, chartDataUri, userId);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return { success: false, error: 'The AI model failed to process the request. Please try again later.' };
  }
}
