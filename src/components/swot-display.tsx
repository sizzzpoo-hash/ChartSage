import { ShieldCheck, ShieldAlert, Zap as ZapIcon, AlertTriangle } from 'lucide-react';
import type { AnalyzeChartAndGenerateTradeSignalOutput } from '@/ai/flows/analyze-chart-and-generate-trade-signal';

type SwotDisplayProps = {
  swot: AnalyzeChartAndGenerateTradeSignalOutput['swot'];
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

export function SwotDisplay({ swot }: SwotDisplayProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SwotSection title="Strengths" items={swot.strengths} icon={ShieldCheck} variant="positive" />
        <SwotSection title="Weaknesses" items={swot.weaknesses} icon={ShieldAlert} variant="negative" />
        <SwotSection title="Opportunities" items={swot.opportunities} icon={ZapIcon} variant="positive" />
        <SwotSection title="Threats" items={swot.threats} icon={AlertTriangle} variant="negative" />
    </div>
  );
}
