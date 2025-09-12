'use client';

import { reviewAnalysisHistory } from '@/ai/flows/review-analysis-history';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { History, Eye } from 'lucide-react';
import withAuth from '@/components/auth/with-auth';
import { useEffect, useState, useCallback } from 'react';
import type { ReviewAnalysisHistoryOutput } from '@/ai/flows/review-analysis-history';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { SwotDisplay } from '@/components/swot-display';

const PAGE_SIZE = 10;

export interface TradeSignal {
  entryPriceRange: string;
  takeProfitLevels: string[];
  stopLossLevel: string;
}

export interface SwotAnalysis {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
}

export interface AnalysisEntry {
  id: string;
  timestamp: string;
  chartName: string;
  analysisSummary: string;
  tradeSignal: TradeSignal;
  chartDataUri?: string;
  swot: SwotAnalysis;
}

function HistoryPage() {
  const { user } = useAuth();
  const [historyPages, setHistoryPages] = useState<Record<number, AnalysisEntry[]>>({});
  const [lastDocTimestamps, setLastDocTimestamps] = useState<Record<number, string | null>>({ 0: null });
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isLastPage, setIsLastPage] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisEntry | null>(null);

  const fetchHistory = useCallback(async (page: number) => {
    if (!user || historyPages[page]) return;

    setLoading(true);
    try {
      const startAfter = lastDocTimestamps[page] || null;
      const result: ReviewAnalysisHistoryOutput = await reviewAnalysisHistory({
        userId: user.uid,
        limit: PAGE_SIZE,
        startAfter,
      });
      
      const newHistory = result.history as AnalysisEntry[];

      setHistoryPages(prev => ({ ...prev, [page]: newHistory }));

      if (newHistory.length < PAGE_SIZE) {
        setIsLastPage(true);
      } else {
        const lastDoc = newHistory[newHistory.length - 1];
        setLastDocTimestamps(prev => ({ ...prev, [page + 1]: lastDoc.timestamp }));
        setIsLastPage(false);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  }, [user, historyPages, lastDocTimestamps]);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  const handleNextPage = () => {
    if (!isLastPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const currentHistory = historyPages[currentPage] || [];

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
                <TableHead className="w-[350px]">Trade Signal</TableHead>
                <TableHead>Analysis Summary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading history...
                  </TableCell>
                </TableRow>
              ) : currentHistory.length > 0 ? (
                currentHistory.map((item) => (
                  <TableRow key={item.id}>
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
                    <TableCell>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-16">Entry:</span>
                          <span className="font-medium">{item.tradeSignal.entryPriceRange}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-muted-foreground w-16">Take Profit:</span>
                           <div className="flex flex-wrap gap-1">
                            {item.tradeSignal.takeProfitLevels.map((tp, i) => <Badge key={i} variant="secondary">{tp}</Badge>)}
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-muted-foreground w-16">Stop Loss:</span>
                           <span className="font-medium">{item.tradeSignal.stopLossLevel}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{item.analysisSummary}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedAnalysis(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No analysis history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-end gap-2">
          <Button
            variant="outline"
            onClick={handlePreviousPage}
            disabled={currentPage === 0 || loading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={isLastPage || loading}
          >
            Next
          </Button>
        </div>
      </CardFooter>
      
      {selectedAnalysis && (
        <Dialog open={!!selectedAnalysis} onOpenChange={(isOpen) => !isOpen && setSelectedAnalysis(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Analysis Details: {selectedAnalysis.chartName} ({new Date(selectedAnalysis.timestamp).toLocaleString()})</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {selectedAnalysis.chartDataUri && (
                <div className="flex justify-center">
                  <Image
                    src={selectedAnalysis.chartDataUri}
                    alt={`Chart for ${selectedAnalysis.chartName}`}
                    width={800}
                    height={500}
                    className="rounded-md object-contain"
                  />
                </div>
              )}
              <Card>
                <CardHeader><CardTitle>Market Analysis</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground/90">{selectedAnalysis.analysisSummary}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>SWOT Analysis</CardTitle></CardHeader>
                <CardContent>
                  <SwotDisplay swot={selectedAnalysis.swot} />
                </CardContent>
              </Card>
            </div>
             <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

export default withAuth(HistoryPage);
