import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownRight, ArrowUpRight, Target, XCircle, Sparkles, ShieldCheck, ShieldAlert, Zap as ZapIcon, AlertTriangle } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useState } from 'react';
import { AnalysisSkeleton } from './analysis-skeleton';

type AnalysisDisplayProps = {
  result: AnalyzeChartAndGenerateTradeSignalOutput;
  onRefine: (question: string) => void;
  isLoading: boolean;
};

export function AnalysisDisplay({ result, onRefine, isLoading }: AnalysisDisplayProps) {
  const { analysis, tradeSignal, swot } = result;
  const [question, setQuestion] = useState('');
  
  const isBuySignal = analysis.toLowerCase().includes('bullish') || analysis.toLowerCase().includes('buy');

  const handleRefine = () => {
    if (question.trim()) {
      onRefine(question);
    }
  };

  const SwotSection = ({ title, items, icon: Icon, variant }: { title: string, items: string[], icon: React.ElementType, variant: 'positive' | 'negative' | 'neutral' }) => (
    <div>
        <h4 className={`flex items-center text-sm font-semibold mb-2 ${variant === 'positive' ? 'text-primary' : variant === 'negative' ? 'text-destructive' : 'text-amber-500'}`}>
            <Icon className="mr-2 h-4 w-4" />
            {title}
        </h4>
        <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-5">
            {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in-50">
      {isLoading ? <AnalysisSkeleton /> : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Market Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90">{analysis}</p>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>SWOT Analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SwotSection title="Strengths" items={swot.strengths} icon={ShieldCheck} variant="positive" />
                <SwotSection title="Weaknesses" items={swot.weaknesses} icon={ShieldAlert} variant="negative" />
                <SwotSection title="Opportunities" items={swot.opportunities} icon={ZapIcon} variant="positive" />
                <SwotSection title="Threats" items={swot.threats} icon={AlertTriangle} variant="negative" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Trade Signal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="flex items-center font-medium text-muted-foreground">
                  {isBuySignal ? (
                    <ArrowUpRight className="mr-2 h-4 w-4 text-primary" />
                  ) : (
                    <ArrowDownRight className="mr-2 h-4 w-4 text-destructive" />
                  )}
                  Entry Price
                </span>
                <span className={`font-semibold ${isBuySignal ? 'text-primary' : 'text-destructive'}`}>
                  {tradeSignal.entryPriceRange}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="flex items-center font-medium text-muted-foreground">
                  <Target className="mr-2 h-4 w-4 text-muted-foreground" />
                  Take Profit
                </span>
                <div className="flex flex-wrap justify-end gap-2">
                  {tradeSignal.takeProfitLevels.map((tp, index) => (
                    <Badge key={index} variant="secondary" className="font-mono">
                      {tp}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="flex items-center font-medium text-muted-foreground">
                  <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  Stop Loss
                </span>
                <span className="font-semibold">{tradeSignal.stopLossLevel}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Refine Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ask a follow-up question, e.g., 'What if the volume was higher?'"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={handleRefine} disabled={isLoading || !question.trim()}>
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoading ? 'Refining...' : 'Refine with AI'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
