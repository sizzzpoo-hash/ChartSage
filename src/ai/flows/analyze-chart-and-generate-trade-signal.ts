'use server';
/**
 * @fileOverview Analyzes a candlestick chart and generates a trade signal.
 *
 * - analyzeChartAndGenerateTradeSignal - A function that handles the chart analysis and trade signal generation.
 * - AnalyzeChartAndGenerateTradeSignalInput - The input type for the analyzeChartAndGenerateTradeSignal function.
 * - AnalyzeChartAndGenerateTradeSignalOutput - The return type for the analyzeChartAndGenerateTradeSignal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OhlcvDataSchema = z.object({
  time: z.string().describe('The timestamp of the candle (ISO 8601 format).'),
  open: z.number().describe('The opening price.'),
  high: z.number().describe('The highest price.'),
  low: z.number().describe('The lowest price.'),
  close: z.number().describe('The closing price.'),
});

const AnalyzeChartAndGenerateTradeSignalInputSchema = z.object({
  chartDataUri: z
    .string()
    .describe(
      "A candlestick chart image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  ohlcvData: z.array(OhlcvDataSchema).optional().describe('The raw OHLCV data for the chart.'),
  rsi: z.number().optional().describe('The latest 14-period Relative Strength Index (RSI) value.'),
  macd: z.object({
    macdLine: z.number(),
    signalLine: z.number(),
    histogram: z.number(),
  }).optional().describe('The latest MACD (12, 26, 9) values.'),
  higherTimeframe: z.string().optional().describe("The higher timeframe to consider for the primary trend (e.g., '1w' for a '1d' chart)."),
  question: z.string().optional().describe('A follow-up question to refine the analysis.'),
  existingAnalysis: z.string().optional().describe('The existing analysis to refine.'),
});
export type AnalyzeChartAndGenerateTradeSignalInput = z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  analysis: z.string().describe('A summary analysis of the candlestick chart.'),
  tradeSignal: z.object({
    entryPriceRange: z.string().describe('The recommended entry price range.'),
    takeProfitLevels: z.array(z.string()).describe('The recommended take profit levels.'),
    stopLossLevel: z.string().describe('The recommended stop loss level.'),
  }).describe('The generated trade signal.'),
});
export type AnalyzeChartAndGenerateTradeSignalOutput = z.infer<typeof AnalyzeChartAndGenerateTradeSignalOutputSchema>;

export async function analyzeChartAndGenerateTradeSignal(input: AnalyzeChartAndGenerateTradeSignalInput): Promise<AnalyzeChartAndGenerateTradeSignalOutput> {
  return analyzeChartAndGenerateTradeSignalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeChartAndGenerateTradeSignalPrompt',
  input: {schema: AnalyzeChartAndGenerateTradeSignalInputSchema},
  output: {schema: AnalyzeChartAndGenerateTradeSignalOutputSchema},
  prompt: `You are an expert financial analyst specializing in multi-timeframe quantitative analysis of candlestick charts and generating trade signals.

Your primary source of information should be the raw OHLCV data provided. Use the chart image for visual confirmation of patterns, but base your calculations and precise price levels on the raw data.

**Multi-Timeframe Strategy:**
{{#if higherTimeframe}}
The primary chart should be analyzed in the context of the trend on the {{higherTimeframe}} timeframe.
1.  **Establish Primary Trend:** First, determine the primary trend on the higher timeframe (e.g., weekly). A simple way is to check if the price is generally above or below a long-term moving average (like the 20-period SMA shown).
2.  **Filter Trades:** Use the primary trend to filter your signals. If the primary trend is bullish, give more weight to bullish patterns and signals on the main chart. If the primary trend is bearish, prioritize bearish signals. Avoid counter-trend trades unless there is a very strong reversal signal.
{{/if}}

{{#if question}}
You are refining a previous analysis based on a user's question.
Previous Analysis: {{{existingAnalysis}}}
User Question: {{{question}}}
Refine the analysis and trade signal based on the question. Do not repeat the previous analysis. Provide a new, more detailed analysis that directly addresses the user's question, and adjust the trade signal if necessary.
{{else}}
Analyze the provided candlestick chart image and the corresponding raw OHLCV data to generate a concise market analysis and a trade signal.
{{/if}}

Chart Image: {{media url=chartDataUri}}

Raw OHLCV Data (use this for calculations):
\`\`\`json
{{{json ohlcvData}}}
\`\`\`

Consider the following technical indicators in your analysis:
- SMA (Simple Moving Average): A 20-period SMA line is visible on the chart.
- RSI (Relative Strength Index): {{#if rsi}}The current RSI value is {{rsi}}. Use this to gauge momentum and identify overbought (typically >70) or oversold (typically <30) conditions.{{else}}(No RSI data provided){{/if}}
- MACD (Moving Average Convergence Divergence): {{#if macd}}The current MACD values are: MACD Line={{macd.macdLine}}, Signal Line={{macd.signalLine}}, Histogram={{macd.histogram}}. Use this to identify trend momentum. A positive histogram suggests bullish momentum, a negative one suggests bearish momentum. Crossovers between the MACD and Signal lines can indicate potential buy or sell signals.{{else}}(No MACD data provided){{/if}}

Based on your quantitative analysis of the data and visual confirmation from the chart, provide the following:

1.  Analysis: A summary analysis of the candlestick chart, highlighting key patterns, trends, and indicator signals, filtered through the lens of the higher timeframe trend. Base price levels and calculations on the raw OHLCV data. Incorporate the RSI and MACD values in your analysis if available.
2.  Trade Signal:
    *   Entry Price Range: The recommended entry price range.
    *   Take Profit Levels: The recommended take profit levels (at least one).
    *   Stop Loss Level: The recommended stop loss level.

Ensure the analysis and trade signal are strictly based on the provided data and avoid any creative or random interpretations. Be very accurate and precise. Do not include any explanations. Provide only the output.`,
});

const analyzeChartAndGenerateTradeSignalFlow = ai.defineFlow(
  {
    name: 'analyzeChartAndGenerateTradeSignalFlow',
    inputSchema: AnalyzeChartAndGenerateTradeSignalInputSchema,
    outputSchema: AnalyzeChartAndGenerateTradeSignalOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
