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
import { initialChartData } from '@/lib/chart-data';
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

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
  }));

  useEffect(() => {
    let isMounted = true;
    let chart: IChartApi | null = null;
    let candleSeries: ISeriesApi<'Candlestick'> | null = null;

    const initializeChart = () => {
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
      
      if (initialChartData.length > 0) {
        candleSeries.setData(initialChartData);
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

      return () => {
        window.removeEventListener('resize', handleResize);
        chart?.remove();
      };
    };

    // Use a timeout to ensure the container is ready
    const timeoutId = setTimeout(() => {
        if (isMounted) {
            initializeChart();
        }
    }, 100);


    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
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
