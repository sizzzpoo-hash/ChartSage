'use client';

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
} from 'lightweight-charts';
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { getBinanceKlines } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

export type TradingChartHandle = {
  takeScreenshot: () => HTMLCanvasElement | undefined;
};

const TradingChart = forwardRef<TradingChartHandle>((_props, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
  }>({ chart: null, series: null });

  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
  }));

  useEffect(() => {
    let isMounted = true;
    let chart: IChartApi | null = null;
    let candleSeries: ISeriesApi<'Candlestick'> | null = null;

    const initializeChart = (initialData: CandlestickData<UTCTimestamp>[]) => {
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
      
      if (initialData.length > 0) {
        candleSeries.setData(initialData);
        chart.timeScale().fitContent();
      }
      
      chartRef.current = { chart, series: candleSeries };

      if (isMounted) {
        setIsLoading(false);
      }
      
      const handleResize = () => {
        if (chartContainerRef.current) {
          chart?.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      // WebSocket for real-time updates
      const symbol = 'btcusdt';
      const interval = '1d';
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline = message.k;
        const newBar: CandlestickData<UTCTimestamp> = {
          time: (kline.t / 1000) as UTCTimestamp,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };
        chartRef.current.series?.update(newBar);
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      return () => {
        ws.close();
        window.removeEventListener('resize', handleResize);
        chart?.remove();
      };
    };

    const fetchData = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      const result = await getBinanceKlines();
      if (isMounted) {
        if (result.success && result.data) {
          initializeChart(result.data);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to load chart data',
            description: result.error || 'Could not fetch live market data from Binance.',
          });
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      chartRef.current.chart?.remove();
    };
  }, [toast]);

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
