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
};

const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ symbol, interval }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
    smaSeries: ISeriesApi<'Line'> | null;
  }>({ chart: null, series: null, smaSeries: null });
  const [isLoading, setIsLoading] = useState(true);
  const [ohlcvData, setOhlcvData] = useState<OhlcvData[]>([]);

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
    getOhlcvData: () => {
      return ohlcvData;
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

  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    const historicalData: CandlestickData<Time>[] = [];
    
    const initializeChart = async () => {
      if (!chartContainerRef.current) return;
      
      setIsLoading(true);

      if (chartRef.current.chart) {
        chartRef.current.chart.remove();
        chartRef.current.chart = null;
      }
      
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
        rightPriceScale: {
          borderColor: '#4A6572',
        },
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#2ECC71',
        downColor: '#E74C3C',
        borderDownColor: '#E74C3C',
        borderUpColor: '#2ECC71',
        wickDownColor: '#E74C3C',
        wickUpColor: '#2ECC71',
      });

      const smaSeries = chart.addLineSeries({
        color: 'rgba(255, 193, 7, 1)',
        lineWidth: 2,
      });
      
      chartRef.current = { chart, series: candleSeries, smaSeries };

      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=150`);
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
        }
        
        historicalData.push(...chartData);

        if (isMounted) {
          candleSeries.setData(chartData);
          const smaData = calculateSma(chartData, 20);
          smaSeries.setData(smaData);
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

          const lastCandle = historicalData[historicalData.length - 1];
          if (candle.time === lastCandle.time) {
            historicalData[historicalData.length - 1] = candle;
            setOhlcvData(prev => [...prev.slice(0, -1), newOhlc]);
          } else {
            historicalData.push(candle);
            historicalData.shift(); // Keep array size constant
            setOhlcvData(prev => [...prev.slice(1), newOhlc]);
          }
          
          if (candleSeries) {
            candleSeries.update(candle);
          }

          if (smaSeries) {
              const lastSmaPoint = calculateSma(historicalData, 20).pop();
              if(lastSmaPoint) {
                smaSeries.update(lastSmaPoint);
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
  }, [symbol, interval]);

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
