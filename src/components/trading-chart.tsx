'use client';

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  Time,
} from 'lightweight-charts';
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { Skeleton } from './ui/skeleton';

export type TradingChartHandle = {
  takeScreenshot: () => HTMLCanvasElement | undefined;
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


const TradingChart = forwardRef<TradingChartHandle>((_props, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
  }>({ chart: null, series: null });
  const [isLoading, setIsLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
  }));

  useEffect(() => {
    let isMounted = true;
    let chart: IChartApi | null = null;
    let candleSeries: ISeriesApi<'Candlestick'> | null = null;
    let ws: WebSocket | null = null;

    const initializeChart = async () => {
      if (!chartContainerRef.current || !isMounted) return;

      chart = createChart(chartContainerRef.current, {
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

      candleSeries = chart.addCandlestickSeries({
        upColor: '#2ECC71',
        downColor: '#E74C3C',
        borderDownColor: '#E74C3C',
        borderUpColor: '#2ECC71',
        wickDownColor: '#E74C3C',
        wickUpColor: '#2ECC71',
      });
      
      chartRef.current = { chart, series: candleSeries };

      // Fetch historical data
      try {
        const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=150');
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

        if (isMounted) {
          candleSeries.setData(chartData);
          chart.timeScale().fitContent();
          setIsLoading(false);
        }

        // Setup WebSocket for live data
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1d');
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const kline = message.k;
          const candle: CandlestickData<Time> = {
            time: (kline.t / 1000) as UTCTimestamp,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };
          if (isMounted && candleSeries) {
            candleSeries.update(candle);
          }
        };

      } catch (error) {
        console.error("Failed to fetch Binance data:", error);
        // Fallback to initialChartData can be implemented here if needed
        if(isMounted) setIsLoading(false); // Stop loading even if there's an error
      }
      
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart?.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        ws?.close();
        chart?.remove();
      };
    };

    const timeoutId = setTimeout(() => {
        if (isMounted) {
            initializeChart();
        }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      ws?.close();
      chartRef.current.chart?.remove();
    };
  }, []);

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