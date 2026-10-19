import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Users,
  Search,
  Filter,
  Download,
  PlusCircle,
  FileCheck2,
  Users2,
  Calendar,
  Building,
  RotateCcw,
  AlertTriangle,
  History,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Award,
  ShieldCheck,
  ChevronRight,
  Layers,
  ArrowUpDown,
  X,
  Phone,
  Mail,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import {
  getAllPerformances,
  getAllUsers,
  getCompanyTeams,
  getProjectSites,
  updatePerformanceRecord,
  exportPerformancesToCsv,
  getPerformanceAuditLogs,
} from '../../services/db';
import type {
  PerformanceRecord,
  UserProfile,
  CompanyTeam,
  ProjectSite,
  PerformanceAuditLog,
  PerformanceType,
} from '../../types';

interface AdminPerformancesViewProps {
  onOpenRegister: () => void;
}

export const AdminPerformancesView: React.FC<AdminPerformancesViewProps> = ({
  onOpenRegister,
}) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'ledger' | 'audit'>('employees');

  const [performances, setPerformances] = useState<PerformanceRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [auditLogs, setAuditLogs] = useState<PerformanceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Chart States (recharts visual analytics)
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [barChartMode, setBarChartMode] = useState<'team' | 'site'>('team');

  // Sorting for Employee Summary
  const [employeeSortBy, setEmployeeSortBy] = useState<'contracts' | 'visitors' | 'name' | 'team'>('contracts');

  // Cancel Modal
  const [recordToCancel, setRecordToCancel] = useState<PerformanceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Detail Modal
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<PerformanceRecord | null>(null);
  const [recordAuditLogs, setRecordAuditLogs] = useState<PerformanceAuditLog[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [pList, uList, tList, sList, aList] = await Promise.all([
        getAllPerformances(),
        getAllUsers(),
        getCompanyTeams(),
        getProjectSites(),
        getPerformanceAuditLogs(),
      ]);
      setPerformances(pList || []);
      // Only approved active employees
      setUsers((uList || []).filter((u) => u.status === 'active'));
      setTeams(tList || []);
      setSites(sList || []);
      setAuditLogs(aList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered performances based on Period, Team, Employee, Type, Status, Search
  const filteredPerformances = performances.filter((p) => {
    if (selectedYear !== 'all') {
      const recYear = p.date.split('-')[0];
      if (recYear !== selectedYear) return false;
    }
    if (selectedMonth !== 'all') {
      const recMonth = p.date.split('-')[1];
      if (recMonth !== selectedMonth) return false;
    }
    if (selectedTeam !== 'all') {
      const recTeam = p.team || p.department || '';
      if (recTeam !== selectedTeam) return false;
    }
    if (selectedEmployeeId !== 'all') {
      if (p.employeeId !== selectedEmployeeId) return false;
    }
    if (selectedType !== 'all') {
      if (p.type !== selectedType) return false;
    }
    if (selectedStatus !== 'all') {
      if (p.status !== selectedStatus) return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchEmp = p.employeeName.toLowerCase().includes(kw);
      const matchNum = p.employeeNumber.toLowerCase().includes(kw);
      const matchSite = p.siteName.toLowerCase().includes(kw);
      const matchId = (p.contractIdentifier || '').toLowerCase().includes(kw);
      const matchMemo = (p.memo || '').toLowerCase().includes(kw);
      return matchEmp || matchNum || matchSite || matchId || matchMemo;
    }
    return true;
  });

  // Calculate Overall KPIs
  const totalContracts = filteredPerformances
    .filter((p) => p.type === 'contract')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const validContracts = filteredPerformances
    .filter((p) => p.type === 'contract' && p.status === 'completed')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const cancelledContracts = filteredPerformances
    .filter((p) => p.type === 'contract' && p.status === 'cancelled')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const totalVisitors = filteredPerformances
    .filter((p) => p.type === 'visitor')
    .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

  // Compute Employee-wise Performance Matrix
  // Every active user is included automatically!
  const employeePerformanceList = users.map((u) => {
    // Records belonging to this employee filtered by selected period
    const empRecords = performances.filter((p) => {
      if (p.employeeId !== u.uid) return false;
      if (selectedYear !== 'all') {
        const recYear = p.date.split('-')[0];
        if (recYear !== selectedYear) return false;
      }
      if (selectedMonth !== 'all') {
        const recMonth = p.date.split('-')[1];
        if (recMonth !== selectedMonth) return false;
      }
      return true;
    });

    const empValidContracts = empRecords
      .filter((p) => p.type === 'contract' && p.status === 'completed')
      .reduce((sum, p) => sum + (p.contractCount || 1), 0);

    const empCancelledContracts = empRecords
      .filter((p) => p.type === 'contract' && p.status === 'cancelled')
      .reduce((sum, p) => sum + (p.contractCount || 1), 0);

    const empTotalContracts = empValidContracts + empCancelledContracts;

    const empVisitors = empRecords
      .filter((p) => p.type === 'visitor')
      .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

    const empNewVisitors = empRecords
      .filter((p) => p.type === 'visitor' && p.visitorType === 'new')
      .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

    const empRevisitVisitors = empRecords
      .filter((p) => p.type === 'visitor' && p.visitorType === 'revisit')
      .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

    // Latest activity
    const sortedDates = empRecords.map((p) => p.date).sort();
    const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : '-';

    return {
      user: u,
      validContracts: empValidContracts,
      cancelledContracts: empCancelledContracts,
      totalContracts: empTotalContracts,
      visitors: empVisitors,
      newVisitors: empNewVisitors,
      revisitVisitors: empRevisitVisitors,
      latestDate,
      totalRecordsCount: empRecords.length,
    };
  });

  // Filter employee list by Team & Keyword
  const filteredEmployeeList = employeePerformanceList
    .filter((item) => {
      if (selectedTeam !== 'all') {
        const userTeam = item.user.team || item.user.department || '';
        if (userTeam !== selectedTeam) return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const matchName = item.user.name.toLowerCase().includes(kw);
        const matchId = (item.user.loginId || item.user.employeeNumber || '').toLowerCase().includes(kw);
        const matchTeam = (item.user.team || '').toLowerCase().includes(kw);
        const matchPos = (item.user.position || '').toLowerCase().includes(kw);
        return matchName || matchId || matchTeam || matchPos;
      }
      return true;
    })
    .sort((a, b) => {
      if (employeeSortBy === 'contracts') {
        if (b.validContracts !== a.validContracts) {
          return b.validContracts - a.validContracts;
        }
        return b.visitors - a.visitors;
      }
      if (employeeSortBy === 'visitors') {
        if (b.visitors !== a.visitors) {
          return b.visitors - a.visitors;
        }
        return b.validContracts - a.validContracts;
      }
      if (employeeSortBy === 'team') {
        return (a.user.team || '').localeCompare(b.user.team || '');
      }
      return a.user.name.localeCompare(b.user.name);
    });

  // 1. Team Comparison Data for Bar Chart
  const teamComparisonData = useMemo(() => {
    const map = new Map<string, { name: string; contracts: number; visitors: number; cancelled: number }>();

    teams.forEach((t) => {
      map.set(t.name, { name: t.name, contracts: 0, visitors: 0, cancelled: 0 });
    });

    filteredPerformances.forEach((p) => {
      const teamName = p.team || p.department || '미지정팀';
      if (!map.has(teamName)) {
        map.set(teamName, { name: teamName, contracts: 0, visitors: 0, cancelled: 0 });
      }
      const entry = map.get(teamName)!;
      if (p.type === 'contract') {
        if (p.status === 'completed') {
          entry.contracts += p.contractCount || 1;
        } else if (p.status === 'cancelled') {
          entry.cancelled += p.contractCount || 1;
        }
      } else if (p.type === 'visitor') {
        entry.visitors += p.visitorCount || 0;
      }
    });

    return Array.from(map.values()).filter(
      (item) => item.contracts > 0 || item.visitors > 0 || item.cancelled > 0 || teams.some((t) => t.name === item.name)
    );
  }, [teams, filteredPerformances]);

  // 2. Site Comparison Data for Bar Chart
  const siteComparisonData = useMemo(() => {
    const map = new Map<string, { name: string; contracts: number; visitors: number; cancelled: number }>();

    sites.forEach((s) => {
      map.set(s.name, { name: s.name, contracts: 0, visitors: 0, cancelled: 0 });
    });

    filteredPerformances.forEach((p) => {
      const siteName = p.siteName || '기타현장';
      if (!map.has(siteName)) {
        map.set(siteName, { name: siteName, contracts: 0, visitors: 0, cancelled: 0 });
      }
      const entry = map.get(siteName)!;
      if (p.type === 'contract') {
        if (p.status === 'completed') {
          entry.contracts += p.contractCount || 1;
        } else if (p.status === 'cancelled') {
          entry.cancelled += p.contractCount || 1;
        }
      } else if (p.type === 'visitor') {
        entry.visitors += p.visitorCount || 0;
      }
    });

    return Array.from(map.values()).filter(
      (item) => item.contracts > 0 || item.visitors > 0 || item.cancelled > 0 || sites.some((s) => s.name === item.name)
    );
  }, [sites, filteredPerformances]);

  const activeBarData = barChartMode === 'team' ? teamComparisonData : siteComparisonData;

  // 3. Monthly Trend Data for Line Chart (12 Months of targetYear)
  const monthlyTrendData = useMemo(() => {
    const targetYear = selectedYear === 'all' ? currentYear : selectedYear;
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

    return months.map((m) => {
      const yearMonthKey = `${targetYear}-${m}`;
      const monthRecords = performances.filter((p) => {
        if (selectedTeam !== 'all' && (p.team || p.department) !== selectedTeam) return false;
        if (selectedEmployeeId !== 'all' && p.employeeId !== selectedEmployeeId) return false;
        return p.date.startsWith(yearMonthKey);
      });

      const contracts = monthRecords
        .filter((p) => p.type === 'contract' && p.status === 'completed')
        .reduce((sum, p) => sum + (p.contractCount || 1), 0);

      const visitors = monthRecords
        .filter((p) => p.type === 'visitor')
        .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

      const cancelled = monthRecords
        .filter((p) => p.type === 'contract' && p.status === 'cancelled')
        .reduce((sum, p) => sum + (p.contractCount || 1), 0);

      return {
        month: `${parseInt(m, 10)}월`,
        fullMonth: yearMonthKey,
        contracts,
        visitors,
        cancelled,
      };
    });
  }, [performances, selectedYear, currentYear, selectedTeam, selectedEmployeeId]);

  const peakMonth = useMemo(() => {
    let max = 0;
    let peak = '';
    monthlyTrendData.forEach((d) => {
      if (d.contracts > max) {
        max = d.contracts;
        peak = d.month;
      }
    });
    return max > 0 ? { month: peak, count: max } : null;
  }, [monthlyTrendData]);

  // Handle Cancel Submission
  const handleConfirmCancel = async () => {
    if (!recordToCancel || !profile) return;
    if (!cancelReason.trim()) {
      setCancelError('계약 취소 사유를 반드시 입력해 주세요.');
      return;
    }

    setCancelling(true);
    setCancelError(null);
    try {
      await updatePerformanceRecord(
        recordToCancel.id,
        {
          status: 'cancelled',
          cancelReason: cancelReason.trim(),
          cancelledAt: new Date().toISOString(),
          cancelledBy: profile.name,
        },
        { uid: profile.uid, name: profile.name },
        cancelReason.trim()
      );
      setRecordToCancel(null);
      setCancelReason('');
      showToast('해당 실적이 정상적으로 취소 처리되었습니다.');
      await loadAllData();
    } catch (err) {
      console.error(err);
      setCancelError('취소 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenDetailModal = async (record: PerformanceRecord) => {
    setSelectedRecordForDetail(record);
    try {
      const logs = await getPerformanceAuditLogs(record.id);
      setRecordAuditLogs(logs || []);
    } catch {
      setRecordAuditLogs([]);
    }
  };

  const handleExportCsv = () => {
    const periodLabel =
      selectedYear === 'all'
        ? '전체'
        : selectedMonth === 'all'
        ? `${selectedYear}년`
        : `${selectedYear}년_${selectedMonth}월`;
    exportPerformancesToCsv(
      filteredPerformances,
      `LEEDO_전사_실적총람_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-amber-400 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-linear-to-r from-[#0F1E36] via-[#162B4E] to-slate-900 p-6 text-white shadow-xl border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
              <ShieldCheck className="h-3.5 w-3.5" />
              전체 실적 & 감사로그
            </span>
            <span className="text-xs text-slate-300">
              총 {users.length}명 승인 직원 자동 연동
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            전사 실적 총괄 및 직원별 실적 분석
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            소속 팀별, 직원별 실적 현황을 한눈에 파악하고 상세 원장 전표 및 변경 감사로그(Audit Log)를 조회합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800/80 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>엑셀 다운로드 (CSV)</span>
          </button>
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-300 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>신규 실적 등록</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">유효 계약 실적</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{validContracts}</span>
            <span className="text-xs font-semibold text-slate-500">건 완료</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            취소 {cancelledContracts}건 제외 순 실적
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">총 내방객 수</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{totalVisitors}</span>
            <span className="text-xs font-semibold text-slate-500">명 유치</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            신규 및 재방문 상담 합계
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">계약 취소율</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {totalContracts > 0
                ? `${((cancelledContracts / totalContracts) * 100).toFixed(1)}%`
                : '0.0%'}
            </span>
            <span className="text-xs font-semibold text-slate-500">({cancelledContracts}건)</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            부정·중복 및 대출 불가 취소
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">활동 승인 직원</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{users.length}</span>
            <span className="text-xs font-semibold text-slate-500">명 재직</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
            승인 즉시 실적표 자동 연동
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-[#0F1E36] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4 text-amber-400" />
          <span>직원별 실적 한눈에 보기</span>
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-400 font-extrabold">
            {filteredEmployeeList.length}명
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-[#0F1E36] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 text-blue-400" />
          <span>전체 실적 원장 전표</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 font-bold">
            {filteredPerformances.length}건
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#0F1E36] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="h-4 w-4 text-purple-400" />
          <span>전사 감사로그 (Audit Log)</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 font-bold">
            {auditLogs.length}건
          </span>
        </button>
      </div>

      {/* Global Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Year */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">전체 연도</option>
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
              </select>
            </div>

            {/* Month */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="text-slate-400 font-bold">월:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">전체 월</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">전체 소속 팀</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'employees' && (
              /* Sort options */
              <div className="flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50/80 px-2.5 py-1.5 text-amber-900 font-bold">
                <ArrowUpDown className="h-3.5 w-3.5 text-amber-600" />
                <span>정렬:</span>
                <select
                  value={employeeSortBy}
                  onChange={(e) => setEmployeeSortBy(e.target.value as any)}
                  className="bg-transparent outline-none cursor-pointer font-bold"
                >
                  <option value="contracts">유효 계약 많은 순</option>
                  <option value="visitors">내방객 많은 순</option>
                  <option value="name">성명 가나다순</option>
                  <option value="team">소속 팀순</option>
                </select>
              </div>
            )}

            {activeTab === 'ledger' && (
              <>
                {/* Employee selector for ledger */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">전체 직원</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} ({u.position})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">계약 & 내방 전체</option>
                    <option value="contract">계약 실적만</option>
                    <option value="visitor">내방객 실적만</option>
                  </select>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="all">전체 상태</option>
                    <option value="completed">정상 완료</option>
                    <option value="cancelled">취소 처리 건</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'employees' ? '직원명, 팀 검색...' : '성명, 동·호수, 메모 검색...'}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
       * TAB 1: 직원별 실적 한눈에 보기 (Employee Performance Matrix)
       * ------------------------------------------------------------- */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              총 <strong className="text-slate-900">{filteredEmployeeList.length}명</strong>의 승인 직원 실적이 집계되었습니다.
              (신규 직원 승인 시 자동으로 목록에 추가됩니다)
            </span>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold border border-amber-200">
              기준 기간: {selectedYear === 'all' ? '전체 누적' : `${selectedYear}년 ${selectedMonth === 'all' ? '전체' : `${selectedMonth}월`}`}
            </span>
          </div>

          {/* Employee Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-center w-12">순위</th>
                  <th className="px-4 py-3">직원 정보 (성명 / 직급)</th>
                  <th className="px-4 py-3">소속 팀</th>
                  <th className="px-4 py-3 text-center bg-blue-50/60 text-blue-900">
                    유효 계약 (완료)
                  </th>
                  <th className="px-4 py-3 text-center">취소 계약</th>
                  <th className="px-4 py-3 text-center">총 계약 합계</th>
                  <th className="px-4 py-3 text-center bg-indigo-50/60 text-indigo-900">
                    총 내방객 수
                  </th>
                  <th className="px-4 py-3 text-center">최근 실적 등록일</th>
                  <th className="px-4 py-3 text-center">원장 조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployeeList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      검색 조건에 해당하는 승인 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredEmployeeList.map((item, idx) => {
                    const isTop1 = idx === 0 && item.validContracts > 0;
                    const isTop3 = idx < 3 && item.validContracts > 0;
                    return (
                      <tr
                        key={item.user.uid}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 text-center">
                          {isTop1 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs">
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">{idx + 1}</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                              {item.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{item.user.name}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                                  {item.user.position}
                                </span>
                                {item.user.role === 'admin' && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                                    관리자
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {item.user.phoneNumber}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {item.user.team || item.user.department || '팀 미배정'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center bg-blue-50/40">
                          <span className="font-black text-blue-700 text-sm">
                            {item.validContracts}
                          </span>
                          <span className="text-xs text-blue-500 ml-0.5 font-bold">건</span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {item.cancelledContracts > 0 ? (
                            <span className="font-semibold text-rose-600">
                              {item.cancelledContracts}건
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center font-bold text-slate-800">
                          {item.totalContracts}건
                        </td>

                        <td className="px-4 py-3 text-center bg-indigo-50/40">
                          <span className="font-bold text-indigo-700 text-sm">
                            {item.visitors}
                          </span>
                          <span className="text-xs text-indigo-500 ml-0.5 font-bold">명</span>
                          {item.visitors > 0 && (
                            <div className="text-[10px] text-slate-400">
                              신규 {item.newVisitors} / 재방문 {item.revisitVisitors}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center text-[11px] text-slate-500">
                          {item.latestDate}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedEmployeeId(item.user.uid);
                              setActiveTab('ledger');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <span>원장 보기</span>
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 2: 전체 실적 원장 전표 (Full Ledger)
       * ------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              총 <strong className="text-slate-900">{filteredPerformances.length}건</strong>의 실적 전표가 조회되었습니다.
            </span>
            {selectedEmployeeId !== 'all' && (
              <button
                onClick={() => setSelectedEmployeeId('all')}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                <span>전체 직원 필터 해제</span>
                <RotateCcw className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">발생일자</th>
                  <th className="px-4 py-3">담당 직원</th>
                  <th className="px-4 py-3">소속 팀</th>
                  <th className="px-4 py-3">분양 현장</th>
                  <th className="px-4 py-3">구분</th>
                  <th className="px-4 py-3">실적 세부 정보</th>
                  <th className="px-4 py-3 text-center">건수/인원</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPerformances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      등록된 실적 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPerformances.map((record) => (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        record.status === 'cancelled' ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {record.date}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{record.employeeName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {record.employeeNumber}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                          {record.team || record.department || '-'}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {record.siteName}
                      </td>

                      <td className="px-4 py-3">
                        {record.type === 'contract' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                            <FileCheck2 className="h-3 w-3" />
                            계약
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                            <Users2 className="h-3 w-3" />
                            내방
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {record.type === 'contract' ? (
                          <div>
                            <span className="font-bold text-slate-900">
                              {record.contractIdentifier || '동호수 미기재'}
                            </span>
                            {record.memo && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {record.memo}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {record.visitorType === 'new' ? '신규 내방' : '재방문'}
                              {record.funnelSource && (
                                <span className="ml-1 text-[11px] text-slate-500">
                                  ({record.funnelSource})
                                </span>
                              )}
                            </div>
                            {record.memo && (
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                {record.memo}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-slate-900">
                        {record.type === 'contract'
                          ? `${record.contractCount || 1}건`
                          : `${record.visitorCount || 0}명`}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {record.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            완료
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3" />
                            취소
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetailModal(record)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="상세 정보 및 감사로그 확인"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {record.type === 'contract' && record.status === 'completed' && (
                            <button
                              onClick={() => {
                                setRecordToCancel(record);
                                setCancelReason('');
                                setCancelError(null);
                              }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="계약 취소 처리"
                            >
                              취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * TAB 3: 전사 실적 감사로그 (Audit Logs)
       * ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold">
              실적 데이터의 생성, 수정, 취소 이력이 위·변조 방지 감사로그로 기록됩니다.
            </span>
            <span className="text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-bold border border-purple-200">
              총 {auditLogs.length}건 기록
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 w-40">발생 일시</th>
                  <th className="px-4 py-3 w-28">구분</th>
                  <th className="px-4 py-3 w-40">수행자</th>
                  <th className="px-4 py-3">변경 및 감사 상세 내역</th>
                  <th className="px-4 py-3 text-center w-28">실적 ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      기록된 감사로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {new Date(log.timestamp).toLocaleString('ko-KR')}
                      </td>

                      <td className="px-4 py-3">
                        {log.action === 'create' && (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            신규 등록
                          </span>
                        )}
                        {log.action === 'cancel' && (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            계약 취소
                          </span>
                        )}
                        {log.action === 'update' && (
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            정보 수정
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900">
                        {log.performedByName}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800 leading-relaxed">
                        {log.details}
                      </td>

                      <td className="px-4 py-3 text-center font-mono text-[10px] text-slate-400">
                        {log.performanceId.substring(0, 10)}...
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL: Contract Cancel Modal
       * ------------------------------------------------------------- */}
      {recordToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-6 py-4">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-bold text-sm">계약 실적 취소 처리</h3>
              </div>
              <button
                onClick={() => setRecordToCancel(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">계약자 / 등록자:</span>
                  <span className="font-bold text-slate-900">
                    {recordToCancel.employeeName} ({recordToCancel.team})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">분양 현장 / 동·호수:</span>
                  <span className="font-bold text-slate-900">
                    {recordToCancel.siteName} {recordToCancel.contractIdentifier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">발생일자:</span>
                  <span className="font-bold text-slate-900">{recordToCancel.date}</span>
                </div>
              </div>

              {cancelError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  계약 취소 사유 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="예: 고객 개인 대출 심사 미승인으로 인한 해약 요청, 중복 등록 정정 등"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-rose-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  취소 처리 시 계약 건수는 실적 합계에서 차감되며, 감사로그에 사유가 영구 보존됩니다.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordToCancel(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  취소 닫기
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {cancelling ? '처리 중...' : '계약 취소 확정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL: Performance Detail Modal
       * ------------------------------------------------------------- */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#0F1E36] px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                  상
                </div>
                <div>
                  <h3 className="font-bold text-sm">실적 전표 상세 내역</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {selectedRecordForDetail.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">등록 직원</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedRecordForDetail.employeeName} ({selectedRecordForDetail.team})
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    구분: {selectedRecordForDetail.type === 'contract' ? '계약' : '내방객'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="text-[10px] text-slate-400">발생일자 & 현장</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {selectedRecordForDetail.date}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedRecordForDetail.siteName}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">실적 구분:</span>
                  <span className="font-bold text-slate-900">
                    {selectedRecordForDetail.type === 'contract' ? '계약 실적' : '내방객 실적'}
                  </span>
                </div>

                {selectedRecordForDetail.type === 'contract' ? (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">계약 동·호수:</span>
                      <span className="font-bold text-blue-700">
                        {selectedRecordForDetail.contractIdentifier || '미기재'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">계약 건수:</span>
                      <span className="font-bold text-slate-900">
                        {selectedRecordForDetail.contractCount || 1}건
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">내방 구분:</span>
                      <span className="font-bold text-indigo-700">
                        {selectedRecordForDetail.visitorType === 'new' ? '신규 내방' : '재방문'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">내방 인원:</span>
                      <span className="font-bold text-slate-900">
                        {selectedRecordForDetail.visitorCount || 0}명
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">유입 경로:</span>
                      <span className="font-medium text-slate-800">
                        {selectedRecordForDetail.funnelSource || '-'}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">처리 상태:</span>
                  <span
                    className={`font-bold ${
                      selectedRecordForDetail.status === 'completed'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {selectedRecordForDetail.status === 'completed' ? '정상 완료' : '취소 처리됨'}
                  </span>
                </div>

                {selectedRecordForDetail.cancelReason && (
                  <div className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-rose-800">
                    <div className="font-bold text-[11px]">취소 사유</div>
                    <div className="text-xs mt-0.5">{selectedRecordForDetail.cancelReason}</div>
                    <div className="text-[10px] text-rose-500 mt-1">
                      취소 처리자: {selectedRecordForDetail.cancelledBy} ({selectedRecordForDetail.cancelledAt})
                    </div>
                  </div>
                )}

                {selectedRecordForDetail.memo && (
                  <div>
                    <span className="text-slate-500 block mb-1">상세 메모:</span>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {selectedRecordForDetail.memo}
                    </div>
                  </div>
                )}
              </div>

              {/* Related Audit Logs */}
              <div>
                <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-purple-600" />
                  <span>해당 전표 변경 이력 (Audit Trail)</span>
                </h4>
                <div className="space-y-1.5">
                  {recordAuditLogs.length === 0 ? (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center text-xs text-slate-400">
                      변경 이력이 없습니다.
                    </div>
                  ) : (
                    recordAuditLogs.map((l) => (
                      <div
                        key={l.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>{l.performedByName}</span>
                          <span>{new Date(l.timestamp).toLocaleString('ko-KR')}</span>
                        </div>
                        <div className="font-medium text-slate-800 mt-1">{l.details}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForDetail(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
