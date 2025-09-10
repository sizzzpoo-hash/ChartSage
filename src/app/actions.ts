'use server';

import { analyzeChartAndGenerateTradeSignal } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import { saveAnalysisResult } from '@/lib/firestore';

export async function getAiAnalysis(
  chartDataUri: string, 
  symbol: string, 
  question?: string, 
  existingAnalysis?: string
) {
  if (!chartDataUri) {
    return { success: false, error: 'Chart image is missing.' };
  }

  try {
    const result = await analyzeChartAndGenerateTradeSignal({ chartDataUri, question, existingAnalysis });
    
    // Don't await this, let it run in the background if it's a new analysis
    if (!question) {
      saveAnalysisResult(result, symbol);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return { success: false, error: 'The AI model failed to process the request. Please try again later.' };
  }
}
