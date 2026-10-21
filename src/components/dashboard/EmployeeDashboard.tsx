import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Users2,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  Award,
  Bell,
  Calendar,
  Building,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  FolderArchive,
  CalendarDays,
  Network,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPerformancesByEmployee,
  getNotices,
  getEvents,
  getLatestEmployeeOfTheMonth,
} from '../../services/db';
import type {
  PerformanceRecord,
  Notice,
  InternalEvent,
  EmployeeOfTheMonth,
} from '../../types';
import { MonthlyPerformanceChart } from './MonthlyPerformanceChart';

interface EmployeeDashboardProps {
  onOpenRegister: () => void;
  onNavigate: (menu: string) => void;
  onSelectNotice: (notice: Notice) => void;
  onSelectEvent: (event: InternalEvent) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  onOpenRegister,
  onNavigate,
  onSelectNotice,
  onSelectEvent,
}) => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [events, setEvents] = useState<InternalEvent[]>([]);
  const [starEmployee, setStarEmployee] = useState<EmployeeOfTheMonth | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [empRecords, allNotices, allEvents, latestStar] = await Promise.all([
        getPerformancesByEmployee(profile.uid),
        getNotices(),
        getEvents(),
        getLatestEmployeeOfTheMonth(),
      ]);

      setRecords(empRecords || []);
      setNotices(allNotices || []);
      setEvents(allEvents || []);
      setStarEmployee(latestStar || null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('leedo_performances_updated', handleUpdate);
    window.addEventListener('leedo_notices_updated', handleUpdate);
    window.addEventListener('leedo_events_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leedo_performances_updated', handleUpdate);
      window.removeEventListener('leedo_notices_updated', handleUpdate);
      window.removeEventListener('leedo_events_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [profile]);

  // Current month metrics
  const currentMonthRecords = records.filter((r) => r.yearMonth === currentYearMonth);
  const currentTotalContracts = currentMonthRecords
    .filter((r) => r.type === 'contract')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const currentValidContracts = currentMonthRecords
    .filter((r) => r.type === 'contract' && r.status === 'completed')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const currentCancelledContracts = currentMonthRecords
    .filter((r) => r.type === 'contract' && r.status === 'cancelled')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const currentTotalVisitors = currentMonthRecords
    .filter((r) => r.type === 'visitor')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  // Cumulative metrics
  const cumulativeContracts = records
    .filter((r) => r.type === 'contract')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const cumulativeValidContracts = records
    .filter((r) => r.type === 'contract' && r.status === 'completed')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);

  const cumulativeVisitors = records
    .filter((r) => r.type === 'visitor')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  // Previous month comparison
  const prevMonthRecords = records.filter((r) => r.yearMonth === prevYearMonth);
  const prevValidContracts = prevMonthRecords
    .filter((r) => r.type === 'contract' && r.status === 'completed')
    .reduce((sum, r) => sum + (r.contractCount || 1), 0);
  const prevVisitors = prevMonthRecords
    .filter((r) => r.type === 'visitor')
    .reduce((sum, r) => sum + (r.visitorCount || 0), 0);

  const contractDiff = currentValidContracts - prevValidContracts;
  const visitorDiff = currentTotalVisitors - prevVisitors;

  const recentRecords = records.slice(0, 5);
  const activeEvents = events.filter((e) => e.status !== 'ended').slice(0, 2);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-[#102447] p-4 sm:p-6 text-white shadow-xl border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {profile?.team || profile?.department || '영업1팀'}
            </span>
          </div>
          <h1 className="mt-2 text-lg sm:text-2xl font-black tracking-tight text-white keep-all">
            안녕하세요, <span className="text-amber-400">{profile?.name}</span> {profile?.position}님
          </h1>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed keep-all">
            {now.getFullYear()}년 {now.getMonth() + 1}월 실적 현황을 확인하고 새로운 계약 및 내방객 실적을 등록하세요.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('calendar')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer min-h-[42px]"
          >
            <CalendarDays className="h-4 w-4 text-blue-400 shrink-0" />
            <span>내 일정표</span>
          </button>
          <button
            onClick={onOpenRegister}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-400/20 hover:bg-amber-300 active:scale-98 transition-all cursor-pointer min-h-[42px]"
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            <span>신규 실적 등록</span>
          </button>
        </div>
      </div>

      {/* Quick Access Portal Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          onClick={() => onNavigate('resources')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 text-left shadow-xs hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-bold">
              <FolderArchive className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">사내 자료실</div>
              <div className="text-[11px] text-slate-500">분양 카탈로그 및 서식</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('calendar')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 text-left shadow-xs hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">개인 업무 일정표</div>
              <div className="text-[11px] text-slate-500">상담 및 내방 예약 관리</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </button>

        <button
          onClick={() => onNavigate('organization')}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 text-left shadow-xs hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-slate-900">사내 조직도</div>
              <div className="text-[11px] text-slate-500">전체 팀별 연락망</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-2 min-[640px]:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* 1. 이번달 총 계약 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold text-slate-600 keep-all">이번 달 계약</span>
              <div className="rounded-lg bg-blue-50 p-1 text-blue-600">
                <FileCheck2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{currentTotalContracts}</span>
              <span className="text-xs font-semibold text-slate-500">건</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight keep-all">
            유효 <span className="font-semibold text-blue-600">{currentValidContracts}</span>건 / 취소 {currentCancelledContracts}건
          </div>
        </div>

        {/* 2. 이번달 내방객 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold text-slate-600 keep-all">이번 달 내방객</span>
              <div className="rounded-lg bg-emerald-50 p-1 text-emerald-600">
                <Users2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{currentTotalVisitors}</span>
              <span className="text-xs font-semibold text-slate-500">명</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight keep-all">
            직접 / 온라인 유입 상담
          </div>
        </div>

        {/* 3. 이번달 유효 계약 (취소 제외) */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[11px] font-black text-blue-900 keep-all">당월 유효 계약</span>
              <div className="rounded-lg bg-blue-600 p-1 text-white">
                <FileCheck2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-blue-900">{currentValidContracts}</span>
              <span className="text-xs font-bold text-blue-700">건</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-blue-600 font-semibold leading-tight keep-all">
            인센티브 산정 실적
          </div>
        </div>

        {/* 4. 누적 계약 건수 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold text-slate-600 keep-all">전체 누적 계약</span>
              <div className="rounded-lg bg-indigo-50 p-1 text-indigo-600">
                <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{cumulativeValidContracts}</span>
              <span className="text-xs font-semibold text-slate-500">건</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight keep-all">
            총 등록 {cumulativeContracts}건
          </div>
        </div>

        {/* 5. 누적 내방객 수 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold text-slate-600 keep-all">전체 누적 내방객</span>
              <div className="rounded-lg bg-amber-50 p-1 text-amber-600">
                <Users2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black text-slate-900">{cumulativeVisitors}</span>
              <span className="text-xs font-semibold text-slate-500">명</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight keep-all">
            누적 고객 유치 실적
          </div>
        </div>

        {/* 6. 전월 대비 실적 증감 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[11px] font-bold text-slate-600 keep-all">전월 대비 증감</span>
              <div
                className={`rounded-lg p-1 ${
                  contractDiff >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {contractDiff >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span
                className={`text-xl sm:text-2xl font-black ${
                  contractDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {contractDiff > 0 ? `+${contractDiff}` : contractDiff}
              </span>
              <span className="text-xs font-semibold text-slate-500">건</span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-tight keep-all">
            내방객 {visitorDiff >= 0 ? `+${visitorDiff}명` : `${visitorDiff}명`}
          </div>
        </div>
      </div>

      {/* Main Grid: Chart + Employee of Month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Trend Chart */}
        <div className="lg:col-span-2">
          <MonthlyPerformanceChart records={records} />
        </div>

        {/* Right 1 Col: Employee of the Month Feature Card */}
        <div className="rounded-2xl border border-amber-200/90 bg-linear-to-b from-amber-50/70 via-white to-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-400 p-1.5 text-slate-950 font-bold">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-amber-950">이달의 우수직원</h3>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    {starEmployee?.yearMonth || currentYearMonth} 선정
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('employee_of_the_month')}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950"
              >
                명예의 전당 &gt;
              </button>
            </div>

            {starEmployee ? (
              <div className="mt-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 text-xl font-black shadow-md ring-4 ring-amber-100">
                  {starEmployee.employeeName.charAt(0)}
                </div>
                <div className="mt-3">
                  <div className="font-bold text-base text-slate-900">
                    {starEmployee.employeeName} {starEmployee.position || '직원'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {starEmployee.team || starEmployee.department} | {starEmployee.assignedSite}
                  </div>
                  <div className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                    {starEmployee.criteriaCategory === 'contract'
                      ? '🏆 최다 계약 달성 우수'
                      : starEmployee.criteriaCategory === 'visitor'
                      ? '🌟 최다 내방 유치 우수'
                      : '🤝 조직 및 실적 공헌'}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-left border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 mb-1">선정 사유</div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{starEmployee.reason}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center text-xs text-slate-400 py-6">
                이달의 우수직원 선정 심사 중입니다.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              * 분양 실적 및 조직 기여도를 바탕으로 매월 관리자가 선정합니다.
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent 5 Records & Company Notices / Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent 5 Performances */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">최근 등록 실적 (5건)</h3>
              <p className="text-[11px] text-slate-500">본인이 직접 등록한 실적 내역</p>
            </div>
            <button
              onClick={() => onNavigate('my_performance')}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>전체 내역 보기</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {recentRecords.length > 0 ? (
            <div className="mt-3 space-y-2 sm:space-y-0 sm:divide-y sm:divide-slate-100">
              {recentRecords.map((r) => (
                <div
                  key={r.id}
                  className="p-3 sm:py-3 sm:px-2 rounded-xl border border-slate-100 sm:border-0 bg-slate-50/60 sm:bg-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                        r.type === 'contract'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {r.type === 'contract' ? '계약' : '내방'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 break-words">
                          {r.type === 'contract'
                            ? r.contractIdentifier || '동호수 미기재'
                            : `${r.visitorCount}명 내방 (${r.visitorType === 'new' ? '신규' : '재방문'})`}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold ${
                            r.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status === 'completed' ? '완료' : '취소'}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 keep-all">
                        {r.siteName} · {r.date} 발생 · {r.team || '영업팀'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end sm:text-right gap-2 pt-1 sm:pt-0 border-t border-slate-200/60 sm:border-0">
                    {r.memo ? (
                      <p className="text-[10px] text-slate-400 truncate max-w-[160px] sm:max-w-[120px]">
                        {r.memo}
                      </p>
                    ) : <span className="sm:hidden text-[10px] text-slate-400">실적 집계</span>}
                    <span className="text-xs sm:text-sm font-black text-slate-900 shrink-0">
                      {r.type === 'contract' ? `${r.contractCount || 1}건 완료` : `${r.visitorCount || 0}명 상담`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              <p>아직 등록된 실적이 없습니다.</p>
              <button
                onClick={onOpenRegister}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                첫 실적 등록하기
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Latest Notices & Ongoing Events */}
        <div className="space-y-6">
          {/* Latest Notices */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-xs">사내 공지사항</h3>
              </div>
              <button
                onClick={() => onNavigate('notices')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                더보기 &gt;
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {notices.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  onClick={() => onSelectNotice(n)}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {n.isImportant && (
                      <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                        중요
                      </span>
                    )}
                    <h4 className="text-xs font-semibold text-slate-800 truncate">
                      {n.title}
                    </h4>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{n.authorName}</span>
                    <span>{new Date(n.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ongoing Events */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-xs">진행 중인 이벤트</h3>
              </div>
              <button
                onClick={() => onNavigate('events')}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700"
              >
                더보기 &gt;
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {activeEvents.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelectEvent(e)}
                  className="rounded-xl border border-amber-100 bg-amber-50/40 p-2.5 hover:bg-amber-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {e.title}
                    </span>
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                      진행중
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 line-clamp-1">
                    {e.description}
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    기간: {e.startDate} ~ {e.endDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
