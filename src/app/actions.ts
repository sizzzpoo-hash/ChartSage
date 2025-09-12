'use server';

import { analyzeChartAndGenerateTradeSignal } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import { saveAnalysisResult } from '@/lib/firestore';
import type { OhlcvData, MacdChartData, BollingerBandsData, RsiData } from '@/components/trading-chart';


export async function getAiAnalysis(
  chartDataUri: string, 
  ohlcvData: OhlcvData[],
  symbol: string,
  interval: string,
  userId: string,
  rsiData: RsiData[] | undefined,
  macdData: MacdChartData[] | undefined,
  bollingerBands: BollingerBandsData | undefined,
  higherTimeframe: string | undefined,
  htfOhlcvData: OhlcvData[] | undefined,
  indicatorConfig: any,
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
    const result = await analyzeChartAndGenerateTradeSignal({ 
      chartDataUri, 
      ohlcvData,
      interval, 
      rsiData, 
      macdData, 
      bollingerBands,
      higherTimeframe,
      htfOhlcvData,
      indicatorConfig,
      question, 
      existingAnalysis 
    });
    
    // Save the analysis result to Firestore ONLY after a successful analysis and if it's not a follow-up question
    if (!question) {
      await saveAnalysisResult(result, symbol, chartDataUri, userId);
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error('AI analysis failed:', error);
    return { success: false, error: 'The AI model failed to process the request. Please try again later.' };
  }
}

    

    