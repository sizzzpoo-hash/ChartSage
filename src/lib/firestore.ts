import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  startAfter as firestoreStartAfter,
  getDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import type { AnalysisEntry } from '@/app/history/page';

const db = getFirestore(app);

export async function saveAnalysisResult(
  analysis: AnalyzeChartAndGenerateTradeSignalOutput,
  symbol: string,
  chartDataUri: string,
  userId: string,
) {
  if (!userId) {
    console.error('No user ID provided, skipping save.');
    return;
  }

  const dataToSave = {
    userId: userId,
    timestamp: new Date(),
    chartName: symbol,
    analysisSummary: analysis.analysis,
    tradeSignal: analysis.tradeSignal,
    chartDataUri: chartDataUri,
    swot: analysis.swot,
  };

  try {
    const docRef = await addDoc(collection(db, 'analysisHistory'), dataToSave);
    console.log('Analysis result saved successfully with document ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Error saving analysis result to Firestore:', error);
    throw error; // Re-throw the error so it can be handled upstream
  }
}

export async function getAnalysisHistory(
  userId: string,
  limitNum: number = 10,
  startAfterTimestampStr?: string | null
): Promise<AnalysisEntry[]> {
  if (!userId) {
    console.error('No user ID provided to getAnalysisHistory.');
    return [];
  }

  try {
    const historyCollection = collection(db, 'analysisHistory');
    
    const queryConstraints = [
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitNum)
    ];

    if (startAfterTimestampStr) {
        const startAfterTimestamp = Timestamp.fromDate(new Date(startAfterTimestampStr));
        queryConstraints.push(firestoreStartAfter(startAfterTimestamp));
    }

    const q = query(historyCollection, ...queryConstraints);

    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.docs.length} documents for user.`);

    const history: AnalysisEntry[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Handle both Date objects and Firestore Timestamps
      let timestamp: string;
      if (data.timestamp?.toDate) {
        // Firestore Timestamp
        timestamp = data.timestamp.toDate().toISOString();
      } else if (data.timestamp instanceof Date) {
        // Regular Date object
        timestamp = data.timestamp.toISOString();
      } else {
        // Fallback
        timestamp = new Date().toISOString();
      }
      
      history.push({
        id: doc.id,
        timestamp: timestamp,
        chartName: data.chartName,
        analysisSummary: data.analysisSummary,
        tradeSignal: data.tradeSignal,
        chartDataUri: data.chartDataUri,
        swot: data.swot,
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching analysis history from Firestore:', error);
    return [];
  }
}
