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
import { getAuth } from 'firebase/auth';
import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import type { ReviewAnalysisHistoryOutput } from '@/ai/flows/review-analysis-history';

const db = getFirestore(app);
const auth = getAuth(app);

export async function saveAnalysisResult(
  analysis: AnalyzeChartAndGenerateTradeSignalOutput,
  symbol: string,
) {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user logged in, skipping save.');
    return;
  }

  try {
    await addDoc(collection(db, 'analysisHistory'), {
      userId: user.uid,
      timestamp: serverTimestamp(),
      chartName: symbol,
      analysisSummary: analysis.analysis,
      tradeSignal: `Entry: ${analysis.tradeSignal.entryPriceRange}, TP: ${analysis.tradeSignal.takeProfitLevels.join(', ')}, SL: ${analysis.tradeSignal.stopLossLevel}`,
    });
  } catch (error) {
    console.error('Error saving analysis result to Firestore:', error);
  }
}

export async function getAnalysisHistory(
  userId: string
): Promise<ReviewAnalysisHistoryOutput> {
  if (!userId) {
    return [];
  }

  try {
    const q = query(
      collection(db, 'analysisHistory'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const history: ReviewAnalysisHistoryOutput = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        timestamp: data.timestamp.toDate().toISOString(),
        chartName: data.chartName,
        analysisSummary: data.analysisSummary,
        tradeSignal: data.tradeSignal,
      });
    });

    return history;
  } catch (error) {
    console.error('Error fetching analysis history from Firestore:', error);
    return [];
  }
}
