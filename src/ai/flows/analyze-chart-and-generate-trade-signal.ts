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
  analysis: z.string().describe('A summary analysis of the candlestick chart.'),
  swot: z.object({
      strengths: z.array(z.string()).describe('Strengths of the current market position (e.g., strong bullish pattern, high volume support).'),
      weaknesses: z.array(z.string()).describe('Weaknesses of the current market position (e.g., proximity to resistance, bearish divergence).'),
      opportunities: z.array(z.string()).describe('Potential opportunities (e.g., upcoming breakout, potential trend reversal).'),
      threats: z.array(z.string()).describe('Potential threats (e.g., major economic event, breakdown of support).'),
  }).describe('A SWOT analysis of the current chart setup.'),
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
  prompt: `You are an expert financial analyst specializing in multi-timeframe quantitative analysis of candlestick charts and generating trade signals. You will act as a specialized agent based on the provided chart interval.

Your primary source of information should be the raw OHLCV data provided. Use the chart image for visual confirmation of patterns, but base your calculations and precise price levels on the raw data.

**Multi-Timeframe Strategy:**
{{#if higherTimeframe}}
The primary chart should be analyzed in the context of the trend on the {{higherTimeframe}} timeframe.
1.  **Establish Primary Trend:** The primary trend on the {{higherTimeframe}} timeframe has been determined for you.
    {{#if isPriceAboveHtfSma}}
    The primary trend is **BULLISH** because the price is above the 20-period SMA on the {{higherTimeframe}} chart.
    {{else}}
    The primary trend is **BEARISH** because the price is below the 20-period SMA on the {{higherTimeframe}} chart.
    {{/if}}
2.  **Filter Trades:** Use this primary trend to strictly filter your signals.
    *   If the primary trend is **BULLISH**, you should only look for and generate **BULLISH** signals on the main chart. Ignore all bearish patterns and signals.
    *   If the primary trend is **BEARISH**, you should only look for and generate **BEARISH** signals on the main chart. Ignore all bullish patterns and signals.
    *   Do not generate counter-trend trade signals.
{{/if}}

**Timeframe-Specific Strategy:**
You will adjust your analysis style based on the chart's interval.
{{#if interval}}
  If the interval is one of '5m', '15m', or '30m', you are a **SCALPING agent**.
  *   **Focus:** Immediate price action and momentum. Aim for quick entries and exits.
  *   **Key Signals:** Look for RSI moving out of overbought/oversold, MACD histogram flips, and price breaking very short-term highs/lows. Volume spikes are critical for confirming moves.
  *   **Signal Profile:** Generate very tight entry ranges. Profit targets should be small and achievable quickly. Stop losses must be extremely tight.
  
  If the interval is one of '1h', '2h', '4h', '6h', '12h', or '1d', you are a **SWING TRADING agent**.
  *   **Focus:** Capturing price "swings" over several hours or days. Trend alignment is important.
  *   **Key Signals:** Look for classic chart patterns (flags, triangles), SMA crossovers, and candlestick patterns near support/resistance. RSI divergence is a strong signal.
  *   **Signal Profile:** Entry ranges can be wider. Aim for at least two take-profit levels. Stop losses should be placed below recent swing lows (for bullish trades) or above swing highs (for bearish trades).

  If the interval is one of '3d' or '1w', you are a **POSITION TRADING agent**.
  *   **Focus:** Identifying and trading along with the major, long-term trend.
  *   **Key Signals:** Focus on major support and resistance levels, long-period SMA (e.g., 20-period on this high timeframe) bounces or breaks, and weekly/monthly candlestick patterns. Ignore minor pullbacks and noise.
  *   **Signal Profile:** Entries should be near major levels. Profit targets should be ambitious, targeting the next major price zone. Stop losses should be wide to accommodate volatility.
{{/if}}


{{#if question}}
You are refining a previous analysis based on a user's question.
Previous Analysis: {{{existingAnalysis}}}
User Question: {{{question}}}
Refine the analysis and trade signal based on the question. Do not repeat the previous analysis. Provide a new, more detailed analysis that directly addresses the user's question, and adjust the trade signal if necessary, while still adhering to the primary trend filter and your agent persona.
{{else}}
Analyze the provided candlestick chart image and the corresponding raw OHLCV data to generate a concise market analysis and a trade signal, according to your agent persona.
{{/if}}

Chart Image: {{media url=chartDataUri}}

Raw OHLCV Data (use this for calculations):
\`\`\`json
{{{json ohlcvData}}}
\`\`\`

Consider the following technical indicators in your analysis, using the specified parameters:
- Candlestick Pattern Analysis: Identify significant candlestick patterns from the OHLCV data.
  - Bullish Patterns to look for: Hammer, Inverted Hammer, Bullish Engulfing, Piercing Line, Morning Star, Three White Soldiers.
  - Bearish Patterns to look for: Hanging Man, Shooting Star, Bearish Engulfing, Dark Cloud Cover, Evening Star, Three Black Crows.
- Volume Analysis: Use the 'volume' field in the OHLCV data to assess the strength of price movements. High volume on a breakout confirms the move. Low volume on a pullback in an uptrend is bullish. Increasing volume on a downtrend is bearish. Note any significant volume spikes.
- SMA (Simple Moving Average): {{#if indicatorConfig.sma.visible}}A {{indicatorConfig.sma.period}}-period SMA line is visible on the chart.{{else}}(SMA not used){{/if}}
- RSI (Relative Strength Index): {{#if rsi}}The current {{indicatorConfig.rsi.period}}-period RSI value is {{rsi}}. Use this to gauge momentum and identify overbought (typically >70) or oversold (typically <30) conditions.{{else}}(RSI not used){{/if}}
- MACD (Moving Average Convergence Divergence): {{#if macd}}The current MACD ({{indicatorConfig.macd.fast}}, {{indicatorConfig.macd.slow}}, {{indicatorConfig.macd.signal}}) values are: MACD Line={{macd.macdLine}}, Signal Line={{macd.signalLine}}, Histogram={{macd.histogram}}. Use this to identify trend momentum. A positive histogram suggests bullish momentum, a negative one suggests bearish momentum. Crossovers between the MACD and Signal lines can indicate potential buy or sell signals.{{else}}(MACD not used){{/if}}
- Bollinger Bands: {{#if bollingerBands}}The current Bollinger Bands ({{indicatorConfig.bollinger.period}}, {{indicatorConfig.bollinger.stdDev}} std. dev.) values are: Upper={{bollingerBands.upper}}, Middle={{bollingerBands.middle}}, Lower={{bollingerBands.lower}}. Use this to assess volatility. Prices near the upper band can be considered expensive, and prices near the lower band can be considered cheap. The width of the bands indicates volatility.{{else}}(Bollinger Bands not used){{/if}}


Based on your quantitative analysis of the data and visual confirmation from the chart, provide the following:

1.  **Analysis**: A summary analysis of the candlestick chart, highlighting key candlestick patterns, trends, and indicator signals, strictly filtered through the lens of the primary timeframe trend and your agent persona. Base price levels and calculations on the raw OHLCV data. Incorporate volume analysis to confirm the strength of your observations.
2.  **SWOT Analysis**: Provide a SWOT analysis for the potential trade signal.
    *   **Strengths**: Internal, positive factors based on the chart. Examples: "Strong bullish engulfing pattern confirmed by high volume," "Price is bouncing off the 20-period SMA on the higher timeframe."
    *   **Weaknesses**: Internal, negative factors based on the chart. Examples: "RSI is approaching overbought territory," "Price is close to a major historical resistance level."
    *   **Opportunities**: External or potential positive future events. Examples: "Potential for a short squeeze if price breaks the upcoming resistance," "A breakout from the current consolidation pattern could lead to a significant move."
    *   **Threats**: External or potential negative future events. Examples: "An upcoming economic news release could introduce high volatility," "Failure to break resistance could lead to a sharp reversal."
3.  **Trade Signal**: A trade signal that aligns with the primary trend and your agent persona.
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
