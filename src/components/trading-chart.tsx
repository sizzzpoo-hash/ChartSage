'use client';

import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
} from 'lightweight-charts';
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { initialChartData } from '@/lib/chart-data';

export type TradingChartHandle = {
  takeScreenshot: () => HTMLCanvasElement | undefined;
};

const TradingChart = forwardRef<TradingChartHandle>((_props, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
  }>({ chart: null, series: null });

  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
  }));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#2C3E50' },
        textColor: 'rgba(234, 239, 248, 0.8)',
      },
      grid: {
        vertLines: { color: '#34495E' },
        horzLines: { color: '#34495E' },
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

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#2ECC71',
      downColor: '#E74C3C',
      borderDownColor: '#E74C3C',
      borderUpColor: '#2ECC71',
      wickDownColor: '#E74C3C',
      wickUpColor: '#2ECC71',
    });

    candleSeries.setData(initialChartData);
    chartRef.current = { chart, series: candleSeries };

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    // Simulate real-time updates
    const interval = setInterval(() => {
        const lastData = initialChartData[initialChartData.length - 1] as CandlestickData<UTCTimestamp>;
        const nextTime = (lastData.time as number) + 24 * 60 * 60;
        const nextClose = lastData.close * (1 + (Math.random() - 0.5) * 0.02);
        const nextOpen = lastData.close;
        const nextHigh = Math.max(nextOpen, nextClose) * (1 + Math.random() * 0.01);
        const nextLow = Math.min(nextOpen, nextClose) * (1 - Math.random() * 0.01);
        const nextBar: CandlestickData<UTCTimestamp> = {
            time: nextTime as UTCTimestamp,
            open: nextOpen,
            high: nextHigh,
            low: nextLow,
            close: nextClose,
        };
        candleSeries.update(nextBar);
        initialChartData.push(nextBar);
    }, 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
      chart.remove();
    };
  }, []);

  return <div ref={chartContainerRef} className="h-[500px] w-full" />;
});

TradingChart.displayName = 'TradingChart';
export default TradingChart;
