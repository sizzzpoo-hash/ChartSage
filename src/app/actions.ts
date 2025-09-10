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

export async function getBinanceKlines(symbol: string = 'BTCUSDT', interval: string = '1d', limit: number = 150) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Binance: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Binance API returns an array of arrays. We need to format it for lightweight-charts.
    // [0: open time, 1: open, 2: high, 3: low, 4: close, 5: volume, ...]
    const formattedData: CandlestickData<UTCTimestamp>[] = data.map((d: any) => ({
      time: (d[0] / 1000) as UTCTimestamp,
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('Binance data fetch failed:', error);
    return { success: false, error: 'Failed to fetch live market data. Please try again later.' };
  }
}
