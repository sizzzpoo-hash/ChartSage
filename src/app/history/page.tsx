'use client';

import { reviewAnalysisHistory } from '@/ai/flows/review-analysis-history';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import withAuth from '@/components/auth/with-auth';
import { useEffect, useState } from 'react';
import type { ReviewAnalysisHistoryOutput } from '@/ai/flows/review-analysis-history';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';


function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ReviewAnalysisHistoryOutput>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getHistory() {
      if (!user) return;

      setLoading(true);
      try {
        const historyData = await reviewAnalysisHistory({ userId: user.uid });
        setHistory(historyData);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    }
    getHistory();
  }, [user]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Analysis History
        </CardTitle>
        <CardDescription>
          Review your past AI-powered chart analyses and trade signals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date</TableHead>
                <TableHead className="w-[100px]">Symbol</TableHead>
                <TableHead className="w-[150px]">Chart</TableHead>
                <TableHead className="w-[250px]">Trade Signal</TableHead>
                <TableHead>Analysis Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : history.length > 0 ? (
                history.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {new Date(item.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.chartName}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.chartDataUri && (
                        <Image
                          src={item.chartDataUri}
                          alt={`Chart for ${item.chartName}`}
                          width={120}
                          height={80}
                          className="rounded-md object-cover"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{item.tradeSignal}</TableCell>
                    <TableCell className="text-muted-foreground">{item.analysisSummary}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No analysis history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default withAuth(HistoryPage);
