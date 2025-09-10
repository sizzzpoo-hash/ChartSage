'use client';

import * as React from 'react';
import { Bot, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import TradingChart, { type TradingChartHandle } from '@/components/trading-chart';
import { getAiAnalysis } from './actions';
import { useToast } from '@/hooks/use-toast';
import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import { AnalysisDisplay } from '@/components/analysis-display';
import { AnalysisSkeleton } from '@/components/analysis-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import withAuth from '@/components/auth/with-auth';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

const cryptoPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
const intervals = ['1h', '4h', '1d', '1w'];

function Home() {
  const chartRef = React.useRef<TradingChartHandle>(null);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeChartAndGenerateTradeSignalOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [symbol, setSymbol] = React.useState('BTCUSDT');
  const [interval, setInterval] = React.useState('1d');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleAnalysis = async (question?: string) => {
    if (!chartRef.current) {
      toast({
        variant: 'destructive',
        title: 'Chart not ready',
        description: 'Please wait for the chart to load before analyzing.',
      });
      return;
    }
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to perform an analysis.',
      });
      return;
    }

    const canvas = chartRef.current.takeScreenshot();
    if (!canvas) {
      toast({
        variant: 'destructive',
        title: 'Failed to capture chart',
        description: 'Could not get an image of the chart. Please try again.',
      });
      return;
    }

    const dataUri = canvas.toDataURL('image/png');
    
    setIsLoading(true);
    if (!question) {
      setAnalysisResult(null);
    }

    const result = await getAiAnalysis(dataUri, symbol, user.uid, question, analysisResult?.analysis);

    if (result.success && result.data) {
      setAnalysisResult(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error || 'An unknown error occurred.',
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="grid flex-1 items-start gap-4 md:gap-8 lg:grid-cols-3 xl:grid-cols-3">
      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div className='flex flex-col gap-4'>
              <div className='flex flex-col gap-2'>
                <CardTitle>Trading Chart</CardTitle>
                <CardDescription>
                  Live {symbol} ({interval}) data from Binance.
                </CardDescription>
              </div>
              <div className='flex gap-4'>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol} name="symbol">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a pair" />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoPairs.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="interval">Interval</Label>
                  <Select value={interval} onValueChange={setInterval} name="interval">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select an interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {intervals.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button onClick={() => handleAnalysis()} disabled={isLoading} size="lg">
              <Zap className="mr-2 h-4 w-4" />
              {isLoading && !analysisResult ? 'Analyzing...' : 'Analyze with AI'}
            </Button>
          </CardHeader>
          <CardContent>
            <TradingChart ref={chartRef} symbol={symbol} interval={interval} />
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Chart analysis is powered by AI and should not be considered financial advice.
            </p>
          </CardFooter>
        </Card>
      </div>

      <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
        <Card className="min-h-[600px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Analysis & Signal
            </CardTitle>
            <CardDescription>
              The AI&apos;s analysis and generated trade signal will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !analysisResult && <AnalysisSkeleton />}
            {analysisResult && (
              <AnalysisDisplay 
                result={analysisResult} 
                onRefine={handleAnalysis}
                isLoading={isLoading} 
              />
            )}
            {!isLoading && !analysisResult && (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
                <div className="rounded-full bg-muted p-3">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Ready to Analyze</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Click the &quot;Analyze with AI&quot; button to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(Home);