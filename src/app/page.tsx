'use client';

import * as React from 'react';
import { Bot, Check, Layers, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import TradingChart, { type TradingChartHandle, type MacdChartData, type OhlcvData, type RsiData } from '@/components/trading-chart';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type { BinanceKline } from '@/components/trading-chart';


const cryptoPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT'];
const intervals = ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '3d', '1w'];
const higherTimeframes = ['1d', '3d', '1w', '1M'];


function Home() {
  const chartRef = React.useRef<TradingChartHandle>(null);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeChartAndGenerateTradeSignalOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [symbol, setSymbol] = React.useState('BTCUSDT');
  const [interval, setInterval] = React.useState('1d');
  const [higherTimeframe, setHigherTimeframe] = React.useState<string | undefined>(undefined);
  const [htfOhlcvData, setHtfOhlcvData] = React.useState<OhlcvData[] | undefined>(undefined);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [indicators, setIndicators] = React.useState({
    sma: { visible: true, period: 20 },
    rsi: { visible: true, period: 14 },
    macd: { visible: false, fast: 12, slow: 26, signal: 9 },
    bollinger: { visible: false, period: 20, stdDev: 2 },
  });
  
  React.useEffect(() => {
    const fetchHtfData = async () => {
      if (!higherTimeframe) {
        setHtfOhlcvData(undefined);
        return;
      }
      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${higherTimeframe}&limit=200`);
        if (!response.ok) throw new Error('Failed to fetch higher timeframe data');
        const data: BinanceKline[] = await response.json();
        
        if (data.length < 20) {
          setHtfOhlcvData(undefined);
          return;
        }

        const htfData: OhlcvData[] = data.map(item => ({
          time: new Date(item[0]).toISOString(),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        }));

        setHtfOhlcvData(htfData);

      } catch (error) {
        console.error("Failed to process higher timeframe data:", error);
        setHtfOhlcvData(undefined);
        toast({
          variant: 'destructive',
          title: 'HTF Data Error',
          description: 'Could not fetch or process data for the selected higher timeframe.',
        });
      }
    };
    
    fetchHtfData();
  }, [higherTimeframe, symbol, toast]);


  const handleIndicatorToggle = (indicator: 'sma' | 'rsi' | 'macd' | 'bollinger') => {
    setIndicators((prev) => ({ 
      ...prev, 
      [indicator]: { ...prev[indicator], visible: !prev[indicator].visible }
    }));
  };
  
  const handleIndicatorParamChange = (indicator: 'sma' | 'rsi' | 'macd' | 'bollinger', param: string, value: string) => {
    const numValue = param === 'stdDev' ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(numValue) || numValue <= 0) return;

    setIndicators(prev => ({
      ...prev,
      [indicator]: { ...prev[indicator], [param]: numValue }
    }));
  };


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
    
    const ohlcvData = chartRef.current.getOhlcvData();
    if (!ohlcvData || ohlcvData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Chart data not available',
        description: 'Could not get the raw chart data. Please try again.',
      });
      return;
    }

    const rsiData = indicators.rsi.visible ? chartRef.current.getRsiData() : undefined;
    const macdData = indicators.macd.visible ? chartRef.current.getMacdData() : undefined;
    const bollingerData = indicators.bollinger.visible ? chartRef.current.getBollingerBandsData() : undefined;
    
    const indicatorConfig = {
      sma: indicators.sma,
      rsi: indicators.rsi,
      macd: indicators.macd,
      bollinger: indicators.bollinger,
    };

    const dataUri = canvas.toDataURL('image/png');
    
    setIsLoading(true);
    if (!question) {
      setAnalysisResult(null);
    }

    const result = await getAiAnalysis(
      dataUri, 
      ohlcvData, 
      symbol,
      interval,
      user.uid, 
      rsiData, 
      macdData, 
      bollingerData, 
      higherTimeframe, 
      htfOhlcvData,
      indicatorConfig, 
      question, 
      analysisResult?.analysis
    );

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
              <div className='flex flex-wrap gap-4'>
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
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label>Indicators</Label>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-[180px] justify-start">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Indicator Settings</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent className='overflow-y-auto'>
                      <SheetHeader>
                        <SheetTitle>Indicator Settings</SheetTitle>
                        <SheetDescription>
                          Customize the technical indicators displayed on the chart.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="grid gap-6 py-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="sma-visible">20-period SMA</Label>
                            <Switch id="sma-visible" checked={indicators.sma.visible} onCheckedChange={() => handleIndicatorToggle('sma')} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <Label htmlFor="bollinger-visible">Bollinger Bands</Label>
                            <Switch id="bollinger-visible" checked={indicators.bollinger.visible} onCheckedChange={() => handleIndicatorToggle('bollinger')} />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor="bollinger-period">BB Period</Label>
                          <Input id="bollinger-period" type="number" value={indicators.bollinger.period} onChange={(e) => handleIndicatorParamChange('bollinger', 'period', e.target.value)} disabled={!indicators.bollinger.visible} />
                        </div>
                         <div className='space-y-2'>
                          <Label htmlFor="bollinger-stdDev">BB Std. Dev.</Label>
                          <Input id="bollinger-stdDev" type="number" step="0.1" value={indicators.bollinger.stdDev} onChange={(e) => handleIndicatorParamChange('bollinger', 'stdDev', e.target.value)} disabled={!indicators.bollinger.visible} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <Label htmlFor="rsi-visible">RSI</Label>
                            <Switch id="rsi-visible" checked={indicators.rsi.visible} onCheckedChange={() => handleIndicatorToggle('rsi')} />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor="rsi-period">RSI Period</Label>
                          <Input id="rsi-period" type="number" value={indicators.rsi.period} onChange={(e) => handleIndicatorParamChange('rsi', 'period', e.target.value)} disabled={!indicators.rsi.visible} />
                        </div>
                         <Separator />
                        <div className="flex items-center justify-between">
                            <Label htmlFor="macd-visible">MACD</Label>                            <Switch id="macd-visible" checked={indicators.macd.visible} onCheckedChange={() => handleIndicatorToggle('macd')} />
                        </div>
                         <div className='space-y-2'>
                          <Label>MACD Parameters</Label>
                          <div className="grid grid-cols-3 gap-2">
                             <Input id="macd-fast" type="number" placeholder="Fast" value={indicators.macd.fast} onChange={(e) => handleIndicatorParamChange('macd', 'fast', e.target.value)} disabled={!indicators.macd.visible} />
                             <Input id="macd-slow" type="number" placeholder="Slow" value={indicators.macd.slow} onChange={(e) => handleIndicatorParamChange('macd', 'slow', e.target.value)} disabled={!indicators.macd.visible} />
                             <Input id="macd-signal" type="number" placeholder="Signal" value={indicators.macd.signal} onChange={(e) => handleIndicatorParamChange('macd', 'signal', e.target.value)} disabled={!indicators.macd.visible} />
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="higherTimeframe">Higher Timeframe</Label>
                  <Select value={higherTimeframe} onValueChange={(value) => setHigherTimeframe(value === 'none' ? undefined : value)} name="higherTimeframe">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select HTF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {higherTimeframes.map((item) => (
                        <SelectItem key={item} value={item} disabled={intervals.indexOf(item) <= intervals.indexOf(interval)}>
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
            <TradingChart
              ref={chartRef}
              symbol={symbol}
              interval={interval}
              smaConfig={indicators.sma}
              rsiConfig={indicators.rsi}
              macdConfig={indicators.macd}
              bollingerBandsConfig={indicators.bollinger}
            />
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

    

    