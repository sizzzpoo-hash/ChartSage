import type { OhlcvData } from "@/components/trading-chart";
import type { CandlestickData, LineData, Time, UTCTimestamp, WhitespaceData } from "lightweight-charts";

// SMA Calculation
export const calculateSma = (data: (CandlestickData<Time> | OhlcvData)[], count: number): (LineData<Time> | WhitespaceData<Time>)[] => {
    const smaData: (LineData<Time> | WhitespaceData<Time>)[] = [];
    if (data.length < count) return [];
    
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
