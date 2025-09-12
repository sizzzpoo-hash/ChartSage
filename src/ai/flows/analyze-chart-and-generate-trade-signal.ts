'use server';
/**
 * @fileOverview Analyzes a candlestick chart and generates a trade signal.
 *
 * - analyzeChartAndGenerateTradeSignal - A function that handles the chart analysis and trade signal generation.
 * - AnalyzeChartAndGenerateTradeSignalInput - The input type for the analyzeChartAndGenerateTradeSignal function.
 * - AnalyzeChartAndGenerateTradeSignalOutput - The return type for the analyzeChartAndGenerateTradeSignal function.
 */

import {ai, searchModel} from '@/ai/genkit';
import {z} from 'genkit';

// Define the tool for the AI to use for searching.
const googleSearch = ai.defineTool(
  {
    name: 'googleSearch',
    description:
      'Searches for recent news, market sentiment, and upcoming economic events for a given cryptocurrency symbol. Returns a summary of findings.',
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'A search query targeting a specific crypto symbol (e.g., "latest news for BTCUSDT").'
        ),
    }),
    outputSchema: z.string().describe('A summary of the search results.'),
  },
  async ({query}) => {
    // This tool's implementation calls another, smaller AI model to generate search results.
    // This simulates a real-world scenario where one AI orchestrates another.
    const {text} = await ai.generate({
      model: searchModel, // Using the specialized 'gemini-2.5-flash-lite' model
      prompt: `You are a financial news summarizer. The user is asking for information about a cryptocurrency. Based on their query, generate a concise summary of plausible recent news, events, or market sentiment.
      
      User Query: "${query}"
      
      Provide a brief, realistic summary. If the query is unclear, state that you couldn't find specific news.`,
    });
    return text;
  }
);

const OhlcvDataSchema = z.object({
  time: z.string().describe('The timestamp of the candle (ISO 8601 format).'),
  open: z.number().describe('The opening price.'),
  high: z.number().describe('The highest price.'),
  low: z.number().describe('The lowest price.'),
  close: z.number().describe('The closing price.'),
  volume: z.number().describe('The trading volume for the period.'),
});

const AnalyzeChartAndGenerateTradeSignalInputSchema = z.object({
  chartDataUri: z
    .string()
    .describe(
      "A candlestick chart image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  ohlcvData: z.array(OhlcvDataSchema).optional().describe('The raw OHLCV data for the chart, including volume.'),
  interval: z.string().optional().describe("The interval of the chart (e.g., '5m', '1h', '1d')."),
  rsi: z.number().optional().describe('The latest Relative Strength Index (RSI) value.'),
  macd: z.object({
    macdLine: z.number(),
    signalLine: z.number(),
    histogram: z.number(),
  }).optional().describe('The latest MACD values.'),
  bollingerBands: z.object({
    upper: z.number(),
    middle: z.number(),
    lower: z.number(),
  }).optional().describe('The latest Bollinger Bands values.'),
  higherTimeframe: z.string().optional().describe("The higher timeframe to consider for the primary trend (e.g., '1w' for a '1d' chart)."),
  isPriceAboveHtfSma: z.boolean().optional().describe("Whether the current price is above the 20-period SMA on the higher timeframe. This determines the primary trend."),
  indicatorConfig: z.any().optional().describe('The configuration for the technical indicators.'),
  question: z.string().optional().describe('A follow-up question to refine the analysis.'),
  existingAnalysis: z.string().optional().describe('The existing analysis to refine.'),
});
export type AnalyzeChartAndGenerateTradeSignalInput = z.infer<typeof AnalyzeChartAndGenerateTradeSignalInputSchema>;

const AnalyzeChartAndGenerateTradeSignalOutputSchema = z.object({
  analysis: z.string().describe('A summary analysis of the candlestick chart, incorporating fundamental analysis from search results.'),
  swot: z.object({
      strengths: z.array(z.string()).describe('Strengths of the current market position (e.g., strong bullish pattern, high volume support).'),
      weaknesses: z.array(z.string()).describe('Weaknesses of the current market position (e.g., proximity to resistance, bearish divergence).'),
      opportunities: z.array(z.string()).describe('Potential opportunities based on technicals and fundamental news (e.g., upcoming breakout, positive news catalyst).'),
      threats: z.array(z.string()).describe('Potential threats based on technicals and fundamental news (e.g., major economic event, negative regulatory news).'),
  }).describe('A SWOT analysis of the current chart setup, informed by both technicals and fundamental news.'),
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
  tools: [googleSearch], // Provide the search tool to the AI.
  input: {schema: AnalyzeChartAndGenerateTradeSignalInputSchema},
  output: {schema: AnalyzeChartAndGenerateTradeSignalOutputSchema},
  prompt: `You are an expert financial analyst who masterfully combines technical chart analysis with fundamental event analysis.

**Your Process:**
1.  **Fundamental Analysis First:** Before analyzing the chart, you MUST use the \`googleSearch\` tool to find recent news, market sentiment, and economic events related to the symbol. Formulate a clear query like "Recent news and market sentiment for BTCUSDT".
2.  **Synthesize Findings:** Integrate the findings from your search into your overall analysis. The search results provide the "why" (fundamental context) behind the "what" (price action).
3.  **Technical Analysis:** Perform a detailed technical analysis of the chart and the provided OHLCV data, guided by the fundamental context.
4.  **Filter by Primary Trend:** Adhere strictly to the multi-timeframe strategy. If a higher timeframe trend is provided, only generate signals that align with it.
5.  **Adopt Agent Persona:** Adjust your trading style (Scalping, Swing, Position) based on the chart's interval.

**Multi-Timeframe Strategy:**
{{#if higherTimeframe}}
The primary trend on the {{higherTimeframe}} timeframe has been determined for you.
{{#if isPriceAboveHtfSma}}
The primary trend is **BULLISH**. Only look for **BULLISH** signals.
{{else}}
The primary trend is **BEARISH**. Only look for **BEARISH** signals.
{{/if}}
{{/if}}

**Timeframe-Specific Agent Persona:**
Adapt your analysis style based on the \`interval\`. For short intervals (e.g., '5m', '15m'), act as a **SCALPER** focusing on immediate momentum. For medium intervals ('1h', '4h'), act as a **SWING TRADER** focusing on patterns. For long intervals ('1d', '1w'), act as a **POSITION TRADER** focusing on major trends.

{{#if question}}
You are refining a previous analysis based on a user's question.
Previous Analysis: {{{existingAnalysis}}}
User Question: {{{question}}}
Refine the analysis and trade signal based on the question. Do not repeat the previous analysis. Provide a new, more detailed analysis that directly addresses the user's question.
{{else}}
Analyze the provided chart and data to generate a market analysis and trade signal.
{{/if}}

Chart Image: {{media url=chartDataUri}}

Raw OHLCV Data (use for calculations):
\`\`\`json
{{{json ohlcvData}}}
\`\`\`

Technical Indicators:
- RSI: {{#if rsi}}{{rsi}}{{else}}N/A{{/if}}
- MACD: {{#if macd}}MACD Line={{macd.macdLine}}, Signal Line={{macd.signalLine}}{{else}}N/A{{/if}}
- Bollinger Bands: {{#if bollingerBands}}Upper={{bollingerBands.upper}}, Lower={{bollingerBands.lower}}{{else}}N/A{{/if}}


**Output Requirements:**

1.  **Analysis**: A summary that starts with the fundamental context from your search, followed by technical analysis.
2.  **SWOT Analysis**:
    *   **Strengths/Weaknesses**: Internal factors from the chart (patterns, indicators).
    *   **Opportunities/Threats**: External factors from your news search (e.g., positive regulatory news, upcoming economic events).
3.  **Trade Signal**: A signal (entry, take profit, stop loss) that is consistent with your analysis and persona.`,
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
