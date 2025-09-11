'use client';

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  Time,
  LineData,
  WhitespaceData,
  PriceScaleOptions,
} from 'lightweight-charts';
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Skeleton } from './ui/skeleton';

export type OhlcvData = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TradingChartHandle = {
  takeScreenshot: () => HTMLCanvasElement | undefined;
  getOhlcvData: () => OhlcvData[];
  getRsiData: () => number | undefined;
};

// Binance API returns data in this format
type BinanceKline = [
  number, // Kline open time
  string, // Open price
  string, // High price
  string, // Low price
  string, // Close price
  string, // Volume
  number, // Kline close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string  // Ignore
];

type TradingChartProps = {
  symbol: string;
  interval: string;
  showSma: boolean;
  showRsi: boolean;
};

const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ symbol, interval, showSma, showRsi }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
    smaSeries: ISeriesApi<'Line'> | null;
    rsiSeries: ISeriesApi<'Line'> | null;
  }>({ chart: null, series: null, smaSeries: null, rsiSeries: null });
  const [isLoading, setIsLoading] = useState(true);
  const [ohlcvData, setOhlcvData] = useState<OhlcvData[]>([]);
  const [fullRsiData, setFullRsiData] = useState<(LineData | WhitespaceData)[]>([]);


  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
    getOhlcvData: () => {
      return ohlcvData;
    },
    getRsiData: () => {
       const lastRsiPoint = fullRsiData[fullRsiData.length - 1];
       if (lastRsiPoint && 'value' in lastRsiPoint) {
         return lastRsiPoint.value;
       }
       return undefined;
    }
  }));

  // SMA Calculation
  const calculateSma = (data: CandlestickData<Time>[], count: number): LineData<Time>[] => {
    const smaData: LineData<Time>[] = [];
    for (let i = count - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < count; j++) {
        sum += data[i - j].close;
      }
      smaData.push({
        time: data[i].time,
        value: sum / count,
      });
    }
    return smaData;
  };

  // RSI Calculation
  const calculateRsi = (data: OhlcvData[], period: number = 14): (LineData<Time> | WhitespaceData<Time>)[] => {
    const rsiValues: (LineData<Time> | WhitespaceData<Time>)[] = [];
    if (data.length < period) return [];

    let gains = 0;
    let losses = 0;

    // First period calculation
    for(let i = 1; i <= period; i++) {
      const change = data[i].close - data[i-1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
      rsiValues.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp });
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsiValues[period-1] = { time: new Date(data[period].time).getTime() / 1000 as UTCTimestamp, value: rsi };

    // Subsequent periods
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i-1].close;
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgLoss = (avgLoss * (period - 1) - change) / period;
        avgGain = (avgGain * (period - 1)) / period;
      }
      
      rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      rsiValues.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp, value: rsi });
    }

    return rsiValues;
  };


  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    let historicalData: CandlestickData<Time>[] = [];
    
    const initializeChart = async () => {
      if (!chartContainerRef.current) return;
      
      setIsLoading(true);

      if (chartRef.current.chart) {
        chartRef.current.chart.remove();
        chartRef.current.chart = null;
      }

      const priceScaleOptions: Partial<PriceScaleOptions> = {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      };

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(234, 239, 248, 0.8)',
        },
        grid: {
          vertLines: { color: 'rgba(70, 130, 180, 0.5)' },
          horzLines: { color: 'rgba(70, 130, 180, 0.5)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          borderColor: '#4A6572',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: priceScaleOptions,
      });

      if (showRsi) {
        chart.applyOptions({
            rightPriceScale: {
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.25,
                },
            },
        });
      } else {
        chart.applyOptions({
            rightPriceScale: {
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
        });
      }
      
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#2ECC71',
        downColor: '#E74C3C',
        borderDownColor: '#E74C3C',
        borderUpColor: '#2ECC71',
        wickDownColor: '#E74C3C',
        wickUpColor: '#2ECC71',
      });

      const smaSeries = showSma ? chart.addLineSeries({
        color: 'rgba(255, 193, 7, 1)',
        lineWidth: 2,
      }) : null;

       const rsiSeries = showRsi ? chart.addLineSeries({
        color: 'rgba(219, 138, 222, 1)',
        lineWidth: 2,
        pane: 1,
        priceScaleId: 'rsi',
       }) : null;
       
       if (rsiSeries) {
          rsiSeries.priceScale().applyOptions({
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          });
          const overboughtLine = rsiSeries.createPriceLine({
              price: 70.0,
              color: '#F9A825',
              lineWidth: 1,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: 'Overbought',
          });
          const oversoldLine = rsiSeries.createPriceLine({
              price: 30.0,
              color: '#29B6F6',
              lineWidth: 1,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: 'Oversold',
          });
       }

      chartRef.current = { chart, series: candleSeries, smaSeries, rsiSeries };

      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data: BinanceKline[] = await response.json();
        const chartData: CandlestickData<Time>[] = data.map(item => ({
          time: (item[0] / 1000) as UTCTimestamp,
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        }));

        const rawOhlcvData: OhlcvData[] = data.map(item => ({
          time: new Date(item[0]).toISOString(),
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
        }));

        if (isMounted) {
          setOhlcvData(rawOhlcvData);
          const rsiResult = calculateRsi(rawOhlcvData);
          setFullRsiData(rsiResult);
          
          if(showRsi && rsiSeries) {
            rsiSeries.setData(rsiResult);
          }
        }
        
        historicalData = chartData;

        if (isMounted) {
          candleSeries.setData(chartData);
          if (showSma && smaSeries) {
            const smaData = calculateSma(chartData, 20);
            smaSeries.setData(smaData);
          }
          chart.timeScale().fitContent();
          setIsLoading(false);
        }

        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
        ws.onmessage = (event) => {
          if (!isMounted) return;
          const message = JSON.parse(event.data);
          const kline = message.k;
          const candle: CandlestickData<Time> = {
            time: (kline.t / 1000) as UTCTimestamp,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };

          const newOhlc: OhlcvData = {
            time: new Date(kline.t).toISOString(),
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };

          let updatedOhlcv: OhlcvData[];
          let updatedChartData: CandlestickData<Time>[];
          const lastCandle = historicalData[historicalData.length - 1];

          if (candle.time === lastCandle.time) {
            updatedChartData = [...historicalData.slice(0, -1), candle];
            updatedOhlcv = [...ohlcvData.slice(0, -1), newOhlc];
          } else {
            updatedChartData = [...historicalData.slice(1), candle];
            updatedOhlcv = [...ohlcvData.slice(1), newOhlc];
          }
          historicalData = updatedChartData;
          setOhlcvData(updatedOhlcv);
          
          const newRsiData = calculateRsi(updatedOhlcv);
          setFullRsiData(newRsiData);
          
          if (candleSeries) {
            candleSeries.update(candle);
          }
          
          if (showSma && smaSeries) {
              const lastSmaPoint = calculateSma(historicalData, 20).pop();
              if(lastSmaPoint) {
                smaSeries.update(lastSmaPoint);
              }
          }

          if(showRsi && rsiSeries) {
            const lastRsiPoint = newRsiData[newRsiData.length-1];
            if(lastRsiPoint) {
              rsiSeries.update(lastRsiPoint);
            }
          }
        };

      } catch (error) {
        console.error("Failed to fetch Binance data:", error);
        if(isMounted) setIsLoading(false);
      }
    };
    
    initializeChart();
    
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current.chart) {
        chartRef.current.chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      ws?.close();
      if (chartRef.current.chart) {
        chartRef.current.chart.remove();
        chartRef.current.chart = null;
      }
    };
  }, [symbol, interval, showSma, showRsi]);

  return (
    <div className="relative h-[500px] w-full">
      {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
              <Skeleton className="h-full w-full" />
          </div>
      )}
      <div ref={chartContainerRef} className={`h-full w-full ${isLoading ? 'invisible' : ''}`} />
    </div>
  );
});

TradingChart.displayName = 'TradingChart';
export default TradingChart;

    