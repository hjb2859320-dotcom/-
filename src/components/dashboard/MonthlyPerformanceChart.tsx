import React, { useState } from 'react';
import type { PerformanceRecord } from '../../types';

interface MonthlyPerformanceChartProps {
  records: PerformanceRecord[];
}

export const MonthlyPerformanceChart: React.FC<MonthlyPerformanceChartProps> = ({ records }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group by last 6 months
  const now = new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    months.push(`${yyyy}-${mm}`);
  }

  const monthlyData = months.map((m) => {
    const monthRecords = records.filter((r) => r.yearMonth === m);
    const validContracts = monthRecords
      .filter((r) => r.type === 'contract' && r.status === 'completed')
      .reduce((sum, r) => sum + (r.contractCount || 1), 0);
    const totalVisitors = monthRecords
      .filter((r) => r.type === 'visitor')
      .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

    const [year, month] = m.split('-');
    const label = `${parseInt(month, 10)}월`;

    return {
      yearMonth: m,
      label,
      contracts: validContracts,
      visitors: totalVisitors,
    };
  });

  const maxContracts = Math.max(...monthlyData.map((d) => d.contracts), 5);
  const maxVisitors = Math.max(...monthlyData.map((d) => d.visitors), 20);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">최근 6개월 실적 추이</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            월별 유효 계약 건수 및 내방객 상담 추이
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-blue-600"></span>
            <span className="font-medium text-slate-600">유효 계약 (건)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-400"></span>
            <span className="font-medium text-slate-600">내방객 (명)</span>
          </div>
        </div>
      </div>

      {/* SVG Multi-Bar / Trend Area */}
      <div className="mt-6 relative h-56 w-full">
        <div className="flex h-44 items-end justify-between gap-3 px-2">
          {monthlyData.map((d, idx) => {
            const contractHeightPct = (d.contracts / maxContracts) * 100;
            const visitorHeightPct = (d.visitors / maxVisitors) * 100;

            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={d.yearMonth}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex flex-1 flex-col items-center justify-end h-full group cursor-pointer"
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] text-white shadow-lg pointer-events-none whitespace-nowrap">
                    <div className="font-bold">{d.yearMonth}</div>
                    <div className="text-blue-300">계약: {d.contracts}건</div>
                    <div className="text-amber-300">내방: {d.visitors}명</div>
                  </div>
                )}

                <div className="flex items-end justify-center gap-1.5 w-full h-full pb-1">
                  {/* Contract Bar */}
                  <div className="w-1/2 max-w-[24px] flex flex-col items-center">
                    <span className="text-[10px] font-bold text-blue-700 mb-1">
                      {d.contracts > 0 ? d.contracts : ''}
                    </span>
                    <div
                      style={{ height: `${Math.max(contractHeightPct, 4)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered ? 'bg-blue-700 shadow-md' : 'bg-blue-600'
                      }`}
                    />
                  </div>

                  {/* Visitor Bar */}
                  <div className="w-1/2 max-w-[24px] flex flex-col items-center">
                    <span className="text-[10px] font-bold text-amber-700 mb-1">
                      {d.visitors > 0 ? d.visitors : ''}
                    </span>
                    <div
                      style={{ height: `${Math.max(visitorHeightPct, 4)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered ? 'bg-amber-500 shadow-md' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                </div>

                {/* X-axis label */}
                <div className="mt-2 text-center text-xs font-semibold text-slate-600">
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
