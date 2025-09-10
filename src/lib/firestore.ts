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
} from 'firebase/firestore';
import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import type { ReviewAnalysisHistoryOutput } from '@/ai/flows/review-analysis-history';

const db = getFirestore(app);

export async function saveAnalysisResult(
  analysis: AnalyzeChartAndGenerateTradeSignalOutput,
  symbol: string,
  chartDataUri: string,
  userId: string,
) {
  console.log('Attempting to save analysis for userId:', userId);
  if (!userId) {
    console.error('No user ID provided, skipping save.');
    return;
  }

  const dataToSave = {
    userId: userId,
    timestamp: serverTimestamp(),
    chartName: symbol,
    analysisSummary: analysis.analysis,
    tradeSignal: `Entry: ${analysis.tradeSignal.entryPriceRange}, TP: ${analysis.tradeSignal.takeProfitLevels.join(', ')}, SL: ${analysis.tradeSignal.stopLossLevel}`,
    chartDataUri: chartDataUri,
  };

  console.log('Data to be saved:', dataToSave);

  try {
    const docRef = await addDoc(collection(db, 'analysisHistory'), dataToSave);
    console.log('Analysis result saved successfully with document ID:', docRef.id);
  } catch (error) {
    console.error('Error saving analysis result to Firestore:', error);
  }
}

export async function getAnalysisHistory(
  userId: string
): Promise<ReviewAnalysisHistoryOutput> {
  console.log('Fetching analysis history for userId:', userId);
  if (!userId) {
    console.error('No user ID provided to getAnalysisHistory.');
    return [];
  }

  try {
    const q = query(
      collection(db, 'analysisHistory'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.docs.length} documents for user.`);

    const history: ReviewAnalysisHistoryOutput = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Processing document:', doc.id, data);
      
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : new Date().toISOString();
      
      history.push({
        timestamp: timestamp,
        chartName: data.chartName,
        analysisSummary: data.analysisSummary,
        tradeSignal: data.tradeSignal,
        chartDataUri: data.chartDataUri,
      });
    });

    console.log('Returning formatted history:', history);
    return history;
  } catch (error) {
    console.error('Error fetching analysis history from Firestore:', error);
    // This error might indicate a missing index. Firebase usually provides a link in the error message to create it.
    return [];
  }
}
