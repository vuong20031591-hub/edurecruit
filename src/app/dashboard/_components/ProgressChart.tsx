'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

interface ChartData {
  label: string;
  tong: number;
  hopLe: number;
}

interface ProgressChartProps {
  data: ChartData[];
  year?: string;
}

const currentYear = new Date().getFullYear();
const defaultSchoolYear = `${currentYear - 1}-${currentYear}`;

export function ProgressChart({ data, year = defaultSchoolYear }: ProgressChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const maxVal = Math.max(100, ...data.map(d => d.tong), ...data.map(d => d.hopLe));
  const yDomainMax = Math.ceil(maxVal / 350) * 350;

  if (!mounted) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Tiến độ tiếp nhận hồ sơ</h3>
            <p className="mt-0.5 text-sm text-slate-500">Số lượng hồ sơ theo tháng</p>
          </div>
          <div className="rounded-full border border-brand-500 px-3 py-1 text-xs font-medium text-brand-500">
            {year}
          </div>
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-lg bg-slate-50" />
        <div className="mt-3 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-6 bg-brand-500" />
            <span className="text-slate-600">Tổng hồ sơ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-6 bg-status-success" />
            <span className="text-slate-600">Hợp lệ</span>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Tiến độ tiếp nhận hồ sơ</h3>
          <p className="mt-0.5 text-sm text-slate-500">Số lượng hồ sơ theo tháng</p>
        </div>
        <div className="rounded-full border border-brand-500 px-3 py-1 text-xs font-medium text-brand-500">
          {year}
        </div>
      </div>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e6dff" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#1e6dff" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity={0.20} />
                <stop offset="100%" stopColor="#16a34a" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, yDomainMax]}
              ticks={[0, yDomainMax * 0.25, yDomainMax * 0.5, yDomainMax * 0.75, yDomainMax]}
              tickFormatter={v => v.toString()}
            />
            <Tooltip
              contentStyle={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontSize: 12
              }}
            />
            <Area type="monotone" dataKey="tong" stroke="none" fill="url(#gradBlue)" />
            <Area type="monotone" dataKey="hopLe" stroke="none" fill="url(#gradGreen)" />
            <Line
              type="monotone"
              dataKey="tong"
              stroke="#1e6dff"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#1e6dff', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="hopLe"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-brand-500" />
          <span className="text-slate-600">Tổng hồ sơ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-status-success" />
          <span className="text-slate-600">Hợp lệ</span>
        </div>
      </div>
    </div>
  );
}
