import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  FileCheck2,
  Users2,
  Building2,
  PieChart,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPerformancesByEmployee, getAllPerformances } from '../../services/db';
import type { PerformanceRecord } from '../../types';

interface PerformanceStatsProps {
  isAdminView?: boolean;
}

export const PerformanceStats: React.FC<PerformanceStatsProps> = ({ isAdminView = false }) => {
  const { profile, isAdmin } = useAuth();
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentYearMonth);
  const [viewScope, setViewScope] = useState<'monthly' | 'cumulative'>('monthly');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isAdminView && isAdmin) {
          const allRecs = await getAllPerformances();
          setRecords(allRecs || []);
        } else if (profile) {
          const empRecs = await getPerformancesByEmployee(profile.uid);
          setRecords(empRecs || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile, isAdminView, isAdmin]);

  // Selected Month calculations
  const monthRecords = records.filter((r) => r.yearMonth === selectedMonth);

  const monthContracts = monthRecords
    .filter((r) => r.type === 'contract')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const monthValidContracts = monthRecords
    .filter((r) => r.type === 'contract' && r.status === 'completed')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const monthCancelledContracts = monthRecords
    .filter((r) => r.type === 'contract' && r.status === 'cancelled')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const monthVisitors = monthRecords
    .filter((r) => r.type === 'visitor')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  const monthNewVisitors = monthRecords
    .filter((r) => r.type === 'visitor' && r.visitorType === 'new')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  const monthRevisitVisitors = monthRecords
    .filter((r) => r.type === 'visitor' && r.visitorType === 'revisit')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  // Cumulative calculations
  const totalContracts = records
    .filter((r) => r.type === 'contract')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const totalValidContracts = records
    .filter((r) => r.type === 'contract' && r.status === 'completed')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const totalCancelledContracts = records
    .filter((r) => r.type === 'contract' && r.status === 'cancelled')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const totalVisitors = records
    .filter((r) => r.type === 'visitor')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  // Breakdown by Site
  const targetRecords = viewScope === 'monthly' ? monthRecords : records;
  const siteMap = new Map<string, { contracts: number; validContracts: number; visitors: number }>();

  targetRecords.forEach((r) => {
    const prev = siteMap.get(r.siteName) || { contracts: 0, validContracts: 0, visitors: 0 };
    if (r.type === 'contract') {
      prev.contracts += r.contractCount || 1;
      if (r.status === 'completed') {
        prev.validContracts += r.contractCount || 1;
      }
    } else {
      prev.visitors += r.visitorCount || 0;
    }
    siteMap.set(r.siteName, prev);
  });

  const siteBreakdown = Array.from(siteMap.entries()).map(([site, data]) => ({
    site,
    ...data,
  }));

  // Funnel Acquisition Breakdown
  const funnelMap = new Map<string, number>();
  targetRecords
    .filter((r) => r.type === 'visitor' && r.funnelSource)
    .forEach((r) => {
      const source = r.funnelSource || '기타';
      funnelMap.set(source, (funnelMap.get(source) || 0) + (r.visitorCount || 0));
    });

  const funnelBreakdown = Array.from(funnelMap.entries()).map(([source, count]) => ({
    source,
    count,
  }));

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {isAdminView ? '회사 전체 실적 종합 분석' : '개인 실적 통계 분석'}
            </h2>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {isAdminView ? '전체 임직원 합산' : `${profile?.name} 실적`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            계약 건수와 내방객 지표를 분리 집계하여 취소 건을 제외한 실 유효 성과를 분석합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setViewScope('monthly')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                viewScope === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              월별 실적
            </button>
            <button
              onClick={() => setViewScope('cumulative')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                viewScope === 'cumulative'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              누적 종합
            </button>
          </div>

          {/* Month selector if monthly */}
          {viewScope === 'monthly' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Valid Contracts */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3.5 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-xs font-bold keep-all">
                {viewScope === 'monthly' ? `${selectedMonth} 유효 계약` : '전체 유효 계약'}
              </span>
              <div className="rounded-lg bg-blue-600 p-1.5 text-white">
                <FileCheck2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-950">
                {viewScope === 'monthly' ? monthValidContracts : totalValidContracts}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-800">건</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-blue-700">
            총 등록 {viewScope === 'monthly' ? monthContracts : totalContracts}건 중 취소{' '}
            <span className="font-semibold text-rose-600">
              {viewScope === 'monthly' ? monthCancelledContracts : totalCancelledContracts}
            </span>
            건 제외
          </div>
        </div>

        {/* Cancelled Contracts */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-xs font-bold">계약 취소 건수</span>
            <div className="rounded-lg bg-rose-600 p-1.5 text-white">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-rose-950">
              {viewScope === 'monthly' ? monthCancelledContracts : totalCancelledContracts}
            </span>
            <span className="text-sm font-bold text-rose-800">건</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-700">
            유효 계약 전환율:{' '}
            {viewScope === 'monthly'
              ? monthContracts > 0
                ? `${Math.round((monthValidContracts / monthContracts) * 100)}%`
                : '100%'
              : totalContracts > 0
              ? `${Math.round((totalValidContracts / totalContracts) * 100)}%`
              : '100%'}
          </div>
        </div>

        {/* Total Visitors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold">
              {viewScope === 'monthly' ? `${selectedMonth} 총 내방객` : '전체 누적 내방객'}
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900">
              {viewScope === 'monthly' ? monthVisitors : totalVisitors}
            </span>
            <span className="text-sm font-bold text-slate-600">명</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            신규 {viewScope === 'monthly' ? monthNewVisitors : '-'}명 / 재방문{' '}
            {viewScope === 'monthly' ? monthRevisitVisitors : '-'}명
          </div>
        </div>

        {/* Conversion Rate Estimate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-xs font-bold">내방객 대비 계약 전환비율</span>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-600">
              {viewScope === 'monthly'
                ? monthVisitors > 0
                  ? `${((monthValidContracts / monthVisitors) * 100).toFixed(1)}`
                  : '0.0'
                : totalVisitors > 0
                ? `${((totalValidContracts / totalVisitors) * 100).toFixed(1)}`
                : '0.0'}
            </span>
            <span className="text-sm font-bold text-amber-600">%</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            내방 고객 상담 후 실제 계약 체결율
          </div>
        </div>
      </div>

      {/* Middle Grid: Site Breakdown & Funnel Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                분양 현장별 실적 비교 ({viewScope === 'monthly' ? selectedMonth : '누적'})
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">현장별 건수</span>
          </div>

          <div className="mt-4 space-y-3">
            {siteBreakdown.length > 0 ? (
              siteBreakdown.map((s) => (
                <div key={s.site} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                    <span>{s.site}</span>
                    <span className="text-blue-600">유효 계약 {s.validContracts}건 / 내방 {s.visitors}명</span>
                  </div>
                  {/* Progress bar visual */}
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden flex">
                    <div
                      style={{
                        width: `${Math.min(
                          (s.validContracts / Math.max(monthValidContracts, totalValidContracts, 1)) * 100,
                          100
                        )}%`,
                      }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                선택된 기간의 현장별 실적 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Funnel Sources */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">
                고객 유입 경로 분석 (내방 마케팅)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">유입 채널</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {funnelBreakdown.length > 0 ? (
              funnelBreakdown.map((f) => (
                <div
                  key={f.source}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/40 p-2.5 text-xs"
                >
                  <span className="font-semibold text-slate-700">{f.source}</span>
                  <span className="font-bold text-slate-900">{f.count}명 유치</span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                유입 경로가 기록된 내방객 실적이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
