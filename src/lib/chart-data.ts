import { CandlestickData, UTCTimestamp } from 'lightweight-charts';

// Generates some random candlestick data
function generateData(count: number, start: Date): CandlestickData<UTCTimestamp>[] {
  const data: CandlestickData<UTCTimestamp>[] = [];
  let current = start.getTime() / 1000;
  let price = 65000;

  for (let i = 0; i < count; i++) {
    const open = price;
    const close = open + (Math.random() - 0.5) * 500;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;

    data.push({
      time: current as UTCTimestamp,
      open,
      high,
      low,
      close,
    });

    price = close;
    current += 24 * 60 * 60; // Add one day
  }
  return data;
}

const startDate = new Date();
startDate.setFullYear(startDate.getFullYear() - 1);

export const initialChartData: CandlestickData<UTCTimestamp>[] = generateData(150, startDate);
