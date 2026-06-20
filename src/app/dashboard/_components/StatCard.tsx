import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Tone = 'blue' | 'green' | 'purple' | 'teal' | 'orange' | 'red';

const toneStyles: Record<Tone, { bg: string; icon: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   ring: 'ring-blue-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  ring: 'ring-green-100' },
  purple: { bg: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100' },
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   ring: 'ring-teal-100' },
  orange: { bg: 'bg-amber-50',  icon: 'text-amber-600',  ring: 'ring-amber-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    ring: 'ring-red-100' }
};

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; up?: boolean };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone?: Tone;
}

export function StatCard({ label, value, sub, trend, icon: Icon, tone = 'blue' }: StatCardProps) {
  const toneCls = toneStyles[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
          {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
          {trend && (
            <div className={cn(
              'mt-2 flex items-center gap-1 text-xs font-medium',
              trend.up === false ? 'text-red-600' : 'text-green-600'
            )}>
              {trend.up !== false ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
          toneCls.bg, toneCls.icon
        )}>
          <Icon size={22} className="text-current" />
        </div>
      </div>
    </div>
  );
}
