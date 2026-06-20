'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState, useEffect } from 'react';

interface BarData {
  name: string;
  value: number;
  full?: string;
}

interface PositionBarChartProps {
  data: BarData[];
}

export function PositionBarChart({ data }: PositionBarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const maxVal = Math.max(100, ...data.map(d => d.value));
  const xDomainMax = Math.ceil(maxVal / 80) * 80;

  if (!mounted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Hồ sơ theo vị trí</h3>
          <p className="mt-0.5 text-sm text-slate-500">Phân bố ứng viên</p>
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-50" />
      </div>
    );
  }


  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Hồ sơ theo vị trí</h3>
        <p className="mt-0.5 text-sm text-slate-500">Phân bố ứng viên</p>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            barCategoryGap={6}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, xDomainMax]}
              ticks={[0, xDomainMax * 0.25, xDomainMax * 0.5, xDomainMax * 0.75, xDomainMax]}
              tickFormatter={v => v.toString()}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#475569' }}
              width={110}
            />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontSize: 12
              }}
              cursor={{ fill: '#f1f5f9' }}
              formatter={(value: number, _name, props: any) => [value, props.payload.full || '']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={index === 0 ? '#1e3a8a' : '#1e40af'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
