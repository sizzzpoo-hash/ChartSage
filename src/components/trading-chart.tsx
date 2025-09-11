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
  HistogramData,
  LineStyle,
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

export type MacdData = {
  macdLine: number;
  signalLine: number;
  histogram: number;
};

export type BollingerBandsData = {
    upper: number;
    middle: number;
    lower: number;
};

export type TradingChartHandle = {
  takeScreenshot: () => HTMLCanvasElement | undefined;
  getOhlcvData: () => OhlcvData[];
  getRsiData: () => number | undefined;
  getMacdData: () => MacdData | undefined;
  getBollingerBandsData: () => BollingerBandsData | undefined;
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

type IndicatorConfig = { visible: boolean; period?: number; };
type MacdIndicatorConfig = { visible: boolean; fast?: number; slow?: number; signal?: number; };
type BollingerBandsConfig = { visible: boolean; period: number; stdDev: number; };

type TradingChartProps = {
  symbol: string;
  interval: string;
  smaConfig: IndicatorConfig & { period: number };
  rsiConfig: IndicatorConfig & { period: number };
  macdConfig: MacdIndicatorConfig & { fast: number; slow: number; signal: number };
  bollingerBandsConfig: BollingerBandsConfig;
};

type MacdCalculatedData = {
  macdLine: (LineData | WhitespaceData)[];
  signalLine: (LineData | WhitespaceData)[];
  histogram: (HistogramData | WhitespaceData)[];
};

type BollingerBandsCalculatedData = {
    upper: (LineData | WhitespaceData)[];
    middle: (LineData | WhitespaceData)[];
    lower: (LineData | WhitespaceData)[];
};


const TradingChart = forwardRef<TradingChartHandle, TradingChartProps>(({ symbol, interval, smaConfig, rsiConfig, macdConfig, bollingerBandsConfig }, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{
    chart: IChartApi | null;
    series: ISeriesApi<'Candlestick'> | null;
    smaSeries: ISeriesApi<'Line'> | null;
    rsiSeries: ISeriesApi<'Line'> | null;
    macdLineSeries: ISeriesApi<'Line'> | null;
    macdSignalSeries: ISeriesApi<'Line'> | null;
    macdHistSeries: ISeriesApi<'Histogram'> | null;
    bbUpperSeries: ISeriesApi<'Line'> | null;
    bbMiddleSeries: ISeriesApi<'Line'> | null;
    bbLowerSeries: ISeriesApi<'Line'> | null;
  }>({ chart: null, series: null, smaSeries: null, rsiSeries: null, macdLineSeries: null, macdSignalSeries: null, macdHistSeries: null, bbUpperSeries: null, bbMiddleSeries: null, bbLowerSeries: null });

  const [isLoading, setIsLoading] = useState(true);
  const [ohlcvData, setOhlcvData] = useState<OhlcvData[]>([]);
  const [fullRsiData, setFullRsiData] = useState<(LineData | WhitespaceData)[]>([]);
  const [fullMacdData, setFullMacdData] = useState<MacdCalculatedData>({ macdLine: [], signalLine: [], histogram: [] });
  const [fullBollingerBandsData, setFullBollingerBandsData] = useState<BollingerBandsCalculatedData>({ upper: [], middle: [], lower: [] });


  useImperativeHandle(ref, () => ({
    takeScreenshot: () => {
      return chartRef.current.chart?.takeScreenshot();
    },
    getOhlcvData: () => {
      return ohlcvData;
    },
    getRsiData: () => {
       const lastRsiPoint = fullRsiData.slice().reverse().find(d => 'value' in d);
       if (lastRsiPoint && 'value' in lastRsiPoint) {
         return lastRsiPoint.value;
       }
       return undefined;
    },
    getMacdData: () => {
      const lastMacd = fullMacdData.macdLine.slice().reverse().find(d => 'value' in d) as LineData | undefined;
      const lastSignal = fullMacdData.signalLine.slice().reverse().find(d => 'value' in d) as LineData | undefined;
      const lastHist = fullMacdData.histogram.slice().reverse().find(d => 'value' in d) as HistogramData | undefined;
      
      if (lastMacd && lastSignal && lastHist) {
        return {
          macdLine: lastMacd.value,
          signalLine: lastSignal.value,
          histogram: lastHist.value,
        }
      }
      return undefined;
    },
    getBollingerBandsData: () => {
        const lastUpper = fullBollingerBandsData.upper.slice().reverse().find(d => 'value' in d) as LineData | undefined;
        const lastMiddle = fullBollingerBandsData.middle.slice().reverse().find(d => 'value' in d) as LineData | undefined;
        const lastLower = fullBollingerBandsData.lower.slice().reverse().find(d => 'value' in d) as LineData | undefined;
        if (lastUpper && lastMiddle && lastLower) {
            return {
                upper: lastUpper.value,
                middle: lastMiddle.value,
                lower: lastLower.value,
            }
        }
        return undefined;
    }
  }));

  // SMA Calculation
  const calculateSma = (data: (CandlestickData<Time> | OhlcvData)[], count: number): (LineData<Time> | WhitespaceData<Time>)[] => {
    const smaData: (LineData<Time> | WhitespaceData<Time>)[] = [];
    for(let i=0; i< count -1; i++) {
        const time = 'time' in data[i] && typeof data[i].time === 'string' ? new Date(data[i].time as string).getTime() / 1000 : data[i].time;
        smaData.push({ time: time as UTCTimestamp });
    }

    for (let i = count - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < count; j++) {
        sum += data[i - j].close;
      }
      const time = 'time' in data[i] && typeof data[i].time === 'string' ? new Date(data[i].time as string).getTime() / 1000 : data[i].time;
      smaData.push({
        time: time as UTCTimestamp,
        value: sum / count,
      });
    }
    return smaData;
  };

  // Bollinger Bands Calculation
  const calculateBollingerBands = (data: OhlcvData[], period: number, stdDev: number): BollingerBandsCalculatedData => {
    if(data.length < period) return { upper: [], middle: [], lower: [] };

    const middleBandData = calculateSma(data, period);
    const upperBandData: (LineData | WhitespaceData)[] = [];
    const lowerBandData: (LineData | WhitespaceData)[] = [];

    for (let i = 0; i < data.length; i++) {
      const time = new Date(data[i].time).getTime() / 1000 as UTCTimestamp;
      if (i < period - 1) {
        upperBandData.push({ time });
        lowerBandData.push({ time });
        continue;
      }

      let sumSqDiff = 0;
      const middleValue = (middleBandData[i] as LineData).value;

      for (let j = i - period + 1; j <= i; j++) {
        sumSqDiff += Math.pow(data[j].close - middleValue, 2);
      }
      const standardDeviation = Math.sqrt(sumSqDiff / period);
      
      upperBandData.push({ time, value: middleValue + stdDev * standardDeviation });
      lowerBandData.push({ time, value: middleValue - stdDev * standardDeviation });
    }

    return { upper: upperBandData, middle: middleBandData, lower: lowerBandData };
  };

  // RSI Calculation
  const calculateRsi = (data: OhlcvData[], period: number = 14): (LineData<Time> | WhitespaceData<Time>)[] => {
    const rsiValues: (LineData<Time> | WhitespaceData<Time>)[] = [];
    if (data.length < period) return [];

    let gains = 0;
    let losses = 0;
    
    // Fill initial undefined values
    for(let i=0; i<period; i++) {
        rsiValues.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp });
    }

    // First period calculation
    for(let i = 1; i <= period; i++) {
      const change = data[i].close - data[i-1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsiValues[period] = { time: new Date(data[period].time).getTime() / 1000 as UTCTimestamp, value: rsi };


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

  // MACD Calculation
  const calculateMacd = (data: OhlcvData[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MacdCalculatedData => {
    const prices = data.map(d => d.close);
    if (prices.length < slowPeriod) return { macdLine: [], signalLine: [], histogram: [] };

    const ema = (arr: number[], period: number) => {
        const k = 2 / (period + 1);
        let emaArr = [arr[0]];
        for (let i = 1; i < arr.length; i++) {
            emaArr.push(arr[i] * k + emaArr[i - 1] * (1 - k));
        }
        return emaArr;
    };

    const fastEma = ema(prices, fastPeriod);
    const slowEma = ema(prices, slowPeriod);

    const macdLine: (LineData | WhitespaceData)[] = [];
    const macdValues: number[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < slowPeriod - 1) {
            macdLine.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp });
        } else {
            const macdValue = fastEma[i] - slowEma[i];
            macdLine.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp, value: macdValue });
            macdValues.push(macdValue);
        }
    }

    const signalEma = ema(macdValues, signalPeriod);
    const signalLine: (LineData | WhitespaceData)[] = [];
    const histogram: (HistogramData | WhitespaceData)[] = [];

    let macdIndex = 0;
    for (let i = 0; i < data.length; i++) {
        if (i < slowPeriod - 1 + signalPeriod - 1) {
            signalLine.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp });
            histogram.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp });
        } else {
            const signalValue = signalEma[macdIndex];
            signalLine.push({ time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp, value: signalValue });
            
            const macdValue = macdValues[macdIndex];
            const histValue = macdValue - signalValue;
            histogram.push({
                time: new Date(data[i].time).getTime() / 1000 as UTCTimestamp,
                value: histValue,
                color: histValue >= 0 ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)',
            });
            macdIndex++;
        }
    }

    return { macdLine, signalLine, histogram };
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

      let paneCount = 0;
      if (rsiConfig.visible) paneCount++;
      if (macdConfig.visible) paneCount++;
      const paneHeight = 100;
      const totalPaneHeight = paneCount * paneHeight;
      const mainChartHeight = 500 - totalPaneHeight;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(234, 239, 248, 0.8)',
        },
        grid: {
          vertLines: { color: 'rgba(70, 130, 180, 0.1)' },
          horzLines: { color: 'rgba(70, 130, 180, 0.1)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          borderColor: '#4A6572',
          timeVisible: true,
          secondsVisible: false,
        },
      });
      
      const candleSeries = chart.addCandlestickSeries({
        upColor: '#2ECC71',
        downColor: '#E74C3C',
        borderDownColor: '#E74C3C',
        borderUpColor: '#2ECC71',
        wickDownColor: '#E74C3C',
        wickUpColor: '#2ECC71',
        priceScaleId: 'right',
      });

      chart.priceScale('right').applyOptions({
         scaleMargins: { top: 0.1, bottom: paneCount > 0 ? (totalPaneHeight / 500) + 0.1 : 0.1 },
      });

      const smaSeries = smaConfig.visible ? chart.addLineSeries({
        color: 'rgba(255, 193, 7, 1)',
        lineWidth: 2,
      }) : null;
      
      const bbUpperSeries = bollingerBandsConfig.visible ? chart.addLineSeries({ color: 'rgba(69, 90, 100, 0.7)', lineWidth: 1 }) : null;
      const bbMiddleSeries = bollingerBandsConfig.visible ? chart.addLineSeries({ color: 'rgba(69, 90, 100, 0.7)', lineWidth: 1, lineStyle: LineStyle.Dashed }) : null;
      const bbLowerSeries = bollingerBandsConfig.visible ? chart.addLineSeries({ color: 'rgba(69, 90, 100, 0.7)', lineWidth: 1 }) : null;

       let currentPane = 0;

       const rsiSeries = rsiConfig.visible ? chart.addLineSeries({
        color: 'rgba(219, 138, 222, 1)',
        lineWidth: 2,
        pane: ++currentPane,
       }) : null;
       
       if (rsiSeries) {
          chart.priceScale('left').applyOptions({
              pane: currentPane,
              scaleMargins: { top: 0.1, bottom: 0.1 },
          });
          rsiSeries.createPriceLine({ price: 70.0, color: '#F9A825', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Overbought' });
          rsiSeries.createPriceLine({ price: 30.0, color: '#29B6F6', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'Oversold' });
       }
       
       const macdLineSeries = macdConfig.visible ? chart.addLineSeries({ color: 'blue', lineWidth: 2, pane: ++currentPane }) : null;
       const macdSignalSeries = macdConfig.visible ? chart.addLineSeries({ color: 'orange', lineWidth: 2, pane: ++currentPane }) : null;
       const macdHistSeries = macdConfig.visible ? chart.addHistogramSeries({ pane: ++currentPane }) : null;

      if(macdLineSeries) {
         chart.priceScale('left').applyOptions({
              pane: currentPane,
              scaleMargins: { top: 0.1, bottom: 0.1 },
          });
      }
      
      chartRef.current = { chart, series: candleSeries, smaSeries, rsiSeries, macdLineSeries, macdSignalSeries, macdHistSeries, bbUpperSeries, bbMiddleSeries, bbLowerSeries };

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
          
          if(rsiConfig.visible && rsiSeries) {
            const rsiResult = calculateRsi(rawOhlcvData, rsiConfig.period);
            setFullRsiData(rsiResult);
            rsiSeries.setData(rsiResult);
          }

          if(macdConfig.visible && macdLineSeries && macdSignalSeries && macdHistSeries) {
            const macdResult = calculateMacd(rawOhlcvData, macdConfig.fast, macdConfig.slow, macdConfig.signal);
            setFullMacdData(macdResult);
            macdLineSeries.setData(macdResult.macdLine);
            macdSignalSeries.setData(macdResult.signalLine);
            macdHistSeries.setData(macdResult.histogram);
          }

          if(bollingerBandsConfig.visible && bbUpperSeries && bbMiddleSeries && bbLowerSeries) {
              const bbResult = calculateBollingerBands(rawOhlcvData, bollingerBandsConfig.period, bollingerBandsConfig.stdDev);
              setFullBollingerBandsData(bbResult);
              bbUpperSeries.setData(bbResult.upper);
              bbMiddleSeries.setData(bbResult.middle);
              bbLowerSeries.setData(bbResult.lower);
          }
        }
        
        historicalData = chartData;

        if (isMounted) {
          candleSeries.setData(chartData);
          if (smaConfig.visible && smaSeries) {
            const smaData = calculateSma(chartData, smaConfig.period);
            smaSeries.setData(smaData as LineData<Time>[]);
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
          const lastCandle = historicalData.length > 0 ? historicalData[historicalData.length - 1] : null;

          if (lastCandle && candle.time === lastCandle.time) {
            updatedChartData = [...historicalData.slice(0, -1), candle];
            updatedOhlcv = [...ohlcvData.slice(0, -1), newOhlc];
          } else {
            updatedChartData = [...historicalData.slice(1), candle];
            updatedOhlcv = [...ohlcvData.slice(1), newOhlc];
          }
          historicalData = updatedChartData;
          setOhlcvData(updatedOhlcv);
          
          if (candleSeries) {
            candleSeries.update(candle);
          }
          
          if (smaConfig.visible && smaSeries) {
              const smaData = calculateSma(historicalData, smaConfig.period);
              const lastSmaPoint = smaData[smaData.length-1];
              if(lastSmaPoint) smaSeries.update(lastSmaPoint as LineData);
          }

          if(rsiConfig.visible && rsiSeries) {
            const newRsiData = calculateRsi(updatedOhlcv, rsiConfig.period);
            setFullRsiData(newRsiData);
            const lastRsiPoint = newRsiData[newRsiData.length-1];
            if(lastRsiPoint) rsiSeries.update(lastRsiPoint);
          }

          if(macdConfig.visible && macdLineSeries && macdSignalSeries && macdHistSeries) {
              const newMacdData = calculateMacd(updatedOhlcv, macdConfig.fast, macdConfig.slow, macdConfig.signal);
              setFullMacdData(newMacdData);
              const lastMacdPoint = newMacdData.macdLine[newMacdData.macdLine.length-1];
              const lastSignalPoint = newMacdData.signalLine[newMacdData.signalLine.length-1];
              const lastHistPoint = newMacdData.histogram[newMacdData.histogram.length-1];
              if(lastMacdPoint) macdLineSeries.update(lastMacdPoint);
              if(lastSignalPoint) macdSignalSeries.update(lastSignalPoint);
              if(lastHistPoint) macdHistSeries.update(lastHistPoint);
          }
           if(bollingerBandsConfig.visible && bbUpperSeries && bbMiddleSeries && bbLowerSeries) {
                const newBbData = calculateBollingerBands(updatedOhlcv, bollingerBandsConfig.period, bollingerBandsConfig.stdDev);
                setFullBollingerBandsData(newBbData);
                const lastUpper = newBbData.upper[newBbData.upper.length - 1];
                const lastMiddle = newBbData.middle[newBbData.middle.length - 1];
                const lastLower = newBbData.lower[newBbData.lower.length - 1];
                if (lastUpper) bbUpperSeries.update(lastUpper as LineData);
                if (lastMiddle) bbMiddleSeries.update(lastMiddle as LineData);
                if (lastLower) bbLowerSeries.update(lastLower as LineData);
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
  }, [symbol, interval, smaConfig, rsiConfig, macdConfig, bollingerBandsConfig]);

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
