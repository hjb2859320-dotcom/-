import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  Building,
  TrendingUp,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Shield,
  Layers,
  ChevronRight,
  ArrowUpRight,
  UserCheck,
  Award,
  Clock,
  X,
  Phone,
  Mail,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { getAllPerformances, getAllUsers, getCompanyTeams, getProjectSites } from '../../services/db';
import type { PerformanceRecord, UserProfile, CompanyTeam, ProjectSite } from '../../types';

interface TeamLeaderPerformanceViewProps {
  onOpenRegister?: () => void;
}

export const TeamLeaderPerformanceView: React.FC<TeamLeaderPerformanceViewProps> = () => {
  const { profile, isAdmin, isTeamLeader, canAccessTeamLeaderSystem } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [performances, setPerformances] = useState<PerformanceRecord[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [projects, setProjects] = useState<ProjectSite[]>([]);

  // Selected Team: Team leader defaults to their own team; Admin can switch
  const [selectedTeam, setSelectedTeam] = useState<string>(profile?.team || '영업1팀');

  // Month Filter (default to current year-month: YYYY-MM)
  const currentYM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYM);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'contracts' | 'visitors' | 'name'>('contracts');

  // Selected Member for Detail Modal
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);

  // Sync state
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load all required data
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [uList, pList, tList, prjList] = await Promise.all([
        getAllUsers(),
        getAllPerformances(),
        getCompanyTeams(),
        getProjectSites(),
      ]);
      setUsers(uList || []);
      setPerformances(pList || []);
      setTeams(tList || []);
      setProjects(prjList || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load team performances:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time events across the app
    const handleUpdate = () => loadData();
    window.addEventListener('leedo_performances_updated', handleUpdate);
    window.addEventListener('leedo_users_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('leedo_performances_updated', handleUpdate);
      window.removeEventListener('leedo_users_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Update selected team if user is team leader
  useEffect(() => {
    if (profile?.team && !isAdmin) {
      setSelectedTeam(profile.team);
    }
  }, [profile?.team, isAdmin]);

  // Available Teams
  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    if (profile?.team) set.add(profile.team);
    teams.forEach((t) => set.add(t.name));
    users.forEach((u) => {
      if (u.team) set.add(u.team);
    });
    // Fallback standard teams
    ['영업1팀', '영업2팀', '분양기획팀'].forEach((t) => set.add(t));
    return Array.from(set);
  }, [teams, users, profile?.team]);

  // Current Team Members (Active users belonging to selectedTeam)
  const teamMembers = useMemo(() => {
    return users.filter(
      (u) =>
        (u.team === selectedTeam || u.department === selectedTeam) &&
        u.status === 'active'
    );
  }, [users, selectedTeam]);

  // Filter performances for the selected team and period
  const teamPerformances = useMemo(() => {
    return performances.filter((p) => {
      if (p.status === 'cancelled') return false; // exclude cancelled records from active metrics
      const matchesTeam = p.team === selectedTeam || p.department === selectedTeam;
      if (!matchesTeam) return false;

      if (viewMode === 'month') {
        return p.yearMonth === selectedYearMonth;
      } else {
        // Year mode: match year part (YYYY)
        const year = selectedYearMonth.substring(0, 4);
        return p.yearMonth.startsWith(year);
      }
    });
  }, [performances, selectedTeam, selectedYearMonth, viewMode]);

  // Member Performance Summaries
  const memberSummaries = useMemo(() => {
    const list = teamMembers.map((member) => {
      const memberPerfs = teamPerformances.filter((p) => p.employeeId === member.uid);

      // Visitor count breakdown
      const visitorRecords = memberPerfs.filter((p) => p.type === 'visitor');
      const totalVisitors = visitorRecords.reduce((acc, cur) => acc + (cur.visitorCount || 1), 0);
      const newVisitors = visitorRecords
        .filter((p) => p.visitorType === 'new')
        .reduce((acc, cur) => acc + (cur.visitorCount || 1), 0);
      const revisitVisitors = visitorRecords
        .filter((p) => p.visitorType === 'revisit')
        .reduce((acc, cur) => acc + (cur.visitorCount || 1), 0);

      // Contract count breakdown
      const contractRecords = memberPerfs.filter((p) => p.type === 'contract');
      const totalContracts = contractRecords.reduce((acc, cur) => acc + (cur.contractCount || 1), 0);
      const contractUnits = contractRecords
        .map((c) => c.contractIdentifier)
        .filter(Boolean) as string[];

      // Conversion rate
      const conversionRate = totalVisitors > 0 ? ((totalContracts / totalVisitors) * 100).toFixed(1) : '0.0';

      // Latest record date
      const dates = memberPerfs.map((p) => p.date).sort();
      const latestDate = dates.length > 0 ? dates[dates.length - 1] : '-';

      const isLeader = member.position === '팀장' || member.position.includes('팀장');

      return {
        member,
        totalVisitors,
        newVisitors,
        revisitVisitors,
        totalContracts,
        contractUnits,
        conversionRate,
        latestDate,
        isLeader,
        recordsCount: memberPerfs.length,
      };
    });

    // Filtering by search term
    let filtered = list;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.member.name.toLowerCase().includes(term) ||
          item.member.employeeNumber?.toLowerCase().includes(term) ||
          item.member.position?.toLowerCase().includes(term) ||
          item.member.assignedSite?.toLowerCase().includes(term)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'contracts') {
        if (b.totalContracts !== a.totalContracts) return b.totalContracts - a.totalContracts;
        return b.totalVisitors - a.totalVisitors;
      }
      if (sortBy === 'visitors') {
        if (b.totalVisitors !== a.totalVisitors) return b.totalVisitors - a.totalVisitors;
        return b.totalContracts - a.totalContracts;
      }
      return a.member.name.localeCompare(b.member.name, 'ko');
    });

    return filtered;
  }, [teamMembers, teamPerformances, searchTerm, sortBy]);

  // Overall Team Aggregates
  const teamAggregates = useMemo(() => {
    const totalVisitors = memberSummaries.reduce((acc, cur) => acc + cur.totalVisitors, 0);
    const totalNewVisitors = memberSummaries.reduce((acc, cur) => acc + cur.newVisitors, 0);
    const totalRevisitVisitors = memberSummaries.reduce((acc, cur) => acc + cur.revisitVisitors, 0);
    const totalContracts = memberSummaries.reduce((acc, cur) => acc + cur.totalContracts, 0);

    const memberCount = teamMembers.length;
    const avgVisitorsPerMember = memberCount > 0 ? (totalVisitors / memberCount).toFixed(1) : '0';
    const avgContractsPerMember = memberCount > 0 ? (totalContracts / memberCount).toFixed(1) : '0';

    const overallConversion = totalVisitors > 0 ? ((totalContracts / totalVisitors) * 100).toFixed(1) : '0.0';

    // MVP Member in Team for selected month
    const mvp = [...memberSummaries].sort((a, b) => b.totalContracts - a.totalContracts)[0];

    return {
      memberCount,
      totalVisitors,
      totalNewVisitors,
      totalRevisitVisitors,
      totalContracts,
      avgVisitorsPerMember,
      avgContractsPerMember,
      overallConversion,
      mvp: mvp && mvp.totalContracts > 0 ? mvp : null,
    };
  }, [memberSummaries, teamMembers]);

  // Monthly Trend Data for the LineChart (Jan to Dec of the selected year)
  const monthlyTrendData = useMemo(() => {
    const year = selectedYearMonth.substring(0, 4);
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return `${year}-${m}`;
    });

    return months.map((ym) => {
      const monthPerfs = performances.filter(
        (p) =>
          p.status !== 'cancelled' &&
          (p.team === selectedTeam || p.department === selectedTeam) &&
          p.yearMonth === ym
      );

      const visitors = monthPerfs
        .filter((p) => p.type === 'visitor')
        .reduce((sum, p) => sum + (p.visitorCount || 1), 0);

      const contracts = monthPerfs
        .filter((p) => p.type === 'contract')
        .reduce((sum, p) => sum + (p.contractCount || 1), 0);

      const label = `${parseInt(ym.split('-')[1], 10)}월`;

      return {
        yearMonth: ym,
        monthLabel: label,
        내방객수: visitors,
        계약건수: contracts,
      };
    });
  }, [performances, selectedTeam, selectedYearMonth]);

  // Member Comparison Bar Chart Data
  const memberChartData = useMemo(() => {
    return memberSummaries.map((item) => ({
      name: `${item.member.name} (${item.member.position})`,
      내방객수: item.totalVisitors,
      계약실적: item.totalContracts,
    }));
  }, [memberSummaries]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      '소속팀',
      '성명',
      '사번',
      '직급',
      '담당현장',
      '조회기준월',
      '총내방객수',
      '신규방문',
      '재방문',
      '총계약건수',
      '계약식별정보(동호수)',
      '계약전환율(%)',
      '최근활동일',
    ];

    const rows = memberSummaries.map((item) => [
      selectedTeam,
      item.member.name,
      item.member.employeeNumber || '',
      item.member.position,
      item.member.assignedSite || '',
      selectedYearMonth,
      item.totalVisitors,
      item.newVisitors,
      item.revisitVisitors,
      item.totalContracts,
      `"${item.contractUnits.join(', ')}"`,
      item.conversionRate,
      item.latestDate,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${selectedTeam}_팀원실적보고서_${selectedYearMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Permission Guard
  if (!canAccessTeamLeaderSystem) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4 shadow-inner">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-rose-950 sm:text-2xl">
          팀장 전용 시스템 접근 권한 제한
        </h2>
        <p className="mt-2 text-sm text-rose-700 max-w-md mx-auto leading-relaxed">
          본 메뉴는 <strong>소속 팀장 및 관리자</strong>만 열람할 수 있는 보안 구역입니다. 일반 직원은 열람 권한이 부여되지 않습니다.
        </p>
        <div className="mt-6 flex justify-center">
          <span className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800 shadow-xs">
            현재 로그인 직급: {profile?.position || '직원'} (열람 불가)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F1E36] via-[#162B4D] to-[#1E3A8A] p-6 text-white shadow-xl sm:p-8 border border-slate-700/60">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-extrabold text-cyan-300 border border-cyan-400/30">
                <Users className="h-3.5 w-3.5 text-cyan-300" />
                팀장 전용 시스템
              </span>
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                {isTeamLeader ? '팀장 열람 권한' : '관리자/임원 통합 권한'}
              </span>
              <span className="text-slate-400 text-xs">
                최종 갱신: {lastRefreshed.toLocaleTimeString('ko-KR')}
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
              <span>{selectedTeam} 팀원 월별 실적 현황</span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              소속 팀원들의 <strong>월별 내방객 수</strong>와 <strong>월별 계약 실적</strong>을 실시간으로 종합 분석하고 비교할 수 있는 팀장 전용 실적 관리 대시보드입니다.
            </p>
          </div>

          {/* Quick Actions & Team Selector (if admin) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer disabled:opacity-50"
              title="데이터 새로고침"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>실적 보고서 엑셀(CSV)</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Team & Month Selection Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Team Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              조회 대상 팀:
            </span>

            {/* If Admin: show all team tabs. If Team Leader: show their team with lock icon */}
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                {availableTeams.map((teamName) => (
                  <button
                    key={teamName}
                    onClick={() => setSelectedTeam(teamName)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedTeam === teamName
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {teamName}
                  </button>
                ))}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-bold text-blue-800">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span>{selectedTeam} (소속팀 고정)</span>
              </div>
            )}
          </div>

          {/* Month & Period Picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Calendar className="h-4 w-4 text-slate-600" />
              <span>실적 기준월:</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none"
              />

              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                <button
                  onClick={() => setViewMode('month')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  월간
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'year'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  연간 누적
                </button>
              </div>

              <button
                onClick={() => setSelectedYearMonth(currentYM)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
              >
                이번 달
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate KPI Stats Cards (Required: 내방객 수 & 계약 실적) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: 월별 총 내방객 수 */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              {viewMode === 'month' ? `${selectedYearMonth}월` : `${selectedYearMonth.substring(0, 4)}년`} 팀 총 내방객 수
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {teamAggregates.totalVisitors.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">명</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-blue-100/80 pt-2.5 text-[11px] text-slate-600">
            <span>신규 방문 <strong className="text-blue-700 font-black">{teamAggregates.totalNewVisitors}</strong>명</span>
            <span className="text-slate-300">•</span>
            <span>재방문 <strong className="text-indigo-700 font-black">{teamAggregates.totalRevisitVisitors}</strong>명</span>
          </div>
        </div>

        {/* KPI 2: 월별 총 계약 실적 */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              {viewMode === 'month' ? `${selectedYearMonth}월` : `${selectedYearMonth.substring(0, 4)}년`} 팀 총 계약 실적
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {teamAggregates.totalContracts.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">건 완료</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-amber-100/80 pt-2.5 text-[11px] text-slate-600">
            <span>계약 전환율 <strong className="text-amber-800 font-black">{teamAggregates.overallConversion}%</strong></span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold">정상 체결 완료건</span>
          </div>
        </div>

        {/* KPI 3: 팀원 1인당 평균 실적 */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              팀원 1인당 평균 생산성
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-black text-slate-900">
                {teamAggregates.avgVisitorsPerMember}
              </span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">명/인</span>
            </div>
            <span className="text-slate-300 text-xl font-light">|</span>
            <div>
              <span className="text-2xl font-black text-emerald-700">
                {teamAggregates.avgContractsPerMember}
              </span>
              <span className="text-[11px] font-bold text-slate-500 ml-1">건/인</span>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-emerald-100/80 pt-2.5 text-[11px] text-slate-600">
            <span>소속 인원: <strong className="text-slate-800">{teamAggregates.memberCount}명</strong></span>
            <span className="text-emerald-700 font-semibold">인당 평균 실적</span>
          </div>
        </div>

        {/* KPI 4: 이달의 팀 최우수 실적자 */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              이달의 팀 내 최다 계약자
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          {teamAggregates.mvp ? (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {teamAggregates.mvp.member.name}
                </span>
                <span className="text-xs font-bold text-purple-700">
                  ({teamAggregates.mvp.member.position})
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-purple-100/80 pt-2.5 text-[11px] text-slate-600">
                <span>계약 <strong className="text-purple-900 font-black">{teamAggregates.mvp.totalContracts}건</strong></span>
                <span className="text-slate-300">•</span>
                <span>내방객 <strong>{teamAggregates.mvp.totalVisitors}명</strong></span>
              </div>
            </>
          ) : (
            <div className="mt-4 text-xs font-medium text-slate-400">
              해당 월에 등록된 계약 실적이 아직 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Visual Analytics Charts Section (recharts) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: 팀원별 월별 실적 비교 막대 차트 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span>팀원별 월별 실적 비교 (내방객 vs 계약)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTeam} 팀원 각각의 {selectedYearMonth} 내방객 수 및 계약 실적 현황
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {memberChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={memberChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1E36',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    itemStyle={{ color: '#fff', fontWeight: 600 }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="내방객수"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="계약실적"
                    fill="#F59E0B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                표시할 팀원 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: 월별 팀 실적 추이 라인 차트 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>{selectedYearMonth.substring(0, 4)}년 월별 실적 추이</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedTeam}의 1월부터 12월까지 월별 내방객 및 계약 실적 변화 흐름
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 15, left: -15, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F1E36',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 600 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="내방객수"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="계약건수"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F59E0B' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table: 팀원 각각의 상세 실적 대장 (내방객 수 & 계약 실적) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <span>팀원별 월별 실적 상세 내역</span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {memberSummaries.length}명
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                팀원 개개인의 월별 내방객 수(신규/재방문)와 계약 실적 건수를 투명하게 대조합니다.
              </p>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <input
                  type="text"
                  placeholder="팀원 성명, 사번, 현장 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 sm:w-64 rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="contracts">계약 많은 순</option>
                  <option value="visitors">내방객 많은 순</option>
                  <option value="name">성명 가나다 순</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 pl-6 pr-3">팀원 정보</th>
                <th className="py-3.5 px-3">직급 / 사번</th>
                <th className="py-3.5 px-3">담당 분양 현장</th>
                <th className="py-3.5 px-3 text-center bg-blue-50/50 text-blue-900 border-x border-blue-100">
                  월별 내방객 수
                </th>
                <th className="py-3.5 px-3 text-center bg-amber-50/50 text-amber-900 border-r border-amber-100">
                  월별 계약 실적
                </th>
                <th className="py-3.5 px-3 text-center">계약 전환율</th>
                <th className="py-3.5 px-3 text-center">최근 실적일</th>
                <th className="py-3.5 pl-3 pr-6 text-right">상세 조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {memberSummaries.length > 0 ? (
                memberSummaries.map((item) => (
                  <tr
                    key={item.member.uid}
                    className="hover:bg-slate-50/90 transition-colors group"
                  >
                    {/* 팀원 정보 */}
                    <td className="py-4 pl-6 pr-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow-xs ${
                            item.isLeader
                              ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {item.member.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-slate-900">
                              {item.member.name}
                            </span>
                            {item.isLeader && (
                              <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-black text-amber-800">
                                팀장
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {item.member.loginId ? `@${item.member.loginId}` : item.member.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 직급 / 사번 */}
                    <td className="py-4 px-3">
                      <div className="font-bold text-slate-800">{item.member.position}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.member.employeeNumber || '-'}
                      </div>
                    </td>

                    {/* 담당 분양 현장 */}
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{item.member.assignedSite || '전사 통합'}</span>
                      </div>
                    </td>

                    {/* 월별 내방객 수 */}
                    <td className="py-4 px-3 bg-blue-50/30 border-x border-blue-100/70 text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-black text-blue-900 text-xs">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span>{item.totalVisitors}명</span>
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                        <span>신규 {item.newVisitors}</span>
                        <span>•</span>
                        <span>재방문 {item.revisitVisitors}</span>
                      </div>
                    </td>

                    {/* 월별 계약 실적 */}
                    <td className="py-4 px-3 bg-amber-50/30 border-r border-amber-100/70 text-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-black text-amber-950 text-xs shadow-xs">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        <span>{item.totalContracts}건 완료</span>
                      </div>
                      {item.contractUnits.length > 0 && (
                        <div className="mt-1 text-[10px] text-amber-800 font-medium truncate max-w-[150px] mx-auto">
                          {item.contractUnits.slice(0, 2).join(', ')}
                          {item.contractUnits.length > 2 && ` 외 ${item.contractUnits.length - 2}건`}
                        </div>
                      )}
                    </td>

                    {/* 계약 전환율 */}
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`font-black text-xs ${
                          parseFloat(item.conversionRate) >= 15
                            ? 'text-emerald-600'
                            : parseFloat(item.conversionRate) > 0
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.conversionRate}%
                      </span>
                    </td>

                    {/* 최근 실적일 */}
                    <td className="py-4 px-3 text-center text-slate-500 text-[11px]">
                      {item.latestDate}
                    </td>

                    {/* 액션 버튼 */}
                    <td className="py-4 pl-3 pr-6 text-right">
                      <button
                        onClick={() => setSelectedMember(item.member)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>실적 대장</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold">조회된 팀원이 없거나 등록된 실적이 없습니다.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {memberSummaries.length > 0 ? (
            memberSummaries.map((item) => (
              <div key={item.member.uid} className="p-4 space-y-3">
                {/* Member Identity Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow-xs ${
                        item.isLeader
                          ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {item.member.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900">
                          {item.member.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {item.member.position}
                        </span>
                        {item.isLeader && (
                          <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-black text-amber-800">
                            팀장
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{item.member.assignedSite || '전사 통합'}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      parseFloat(item.conversionRate) >= 15
                        ? 'bg-emerald-100 text-emerald-800'
                        : parseFloat(item.conversionRate) > 0
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    전환율 {item.conversionRate}%
                  </span>
                </div>

                {/* 2-Column Performance Metric Box (내방객 수 vs 계약 실적) */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  {/* Left: 내방객 수 */}
                  <div className="rounded-lg bg-blue-50/70 p-2 border border-blue-100">
                    <div className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>월별 내방객 수</span>
                    </div>
                    <div className="text-base font-black text-blue-900 mt-0.5">
                      {item.totalVisitors}명
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      신규 {item.newVisitors} · 재방문 {item.revisitVisitors}
                    </div>
                  </div>

                  {/* Right: 계약 실적 */}
                  <div className="rounded-lg bg-amber-50/70 p-2 border border-amber-100">
                    <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      <span>월별 계약 실적</span>
                    </div>
                    <div className="text-base font-black text-amber-950 mt-0.5">
                      {item.totalContracts}건
                    </div>
                    <div className="text-[10px] text-amber-800 truncate mt-0.5">
                      {item.contractUnits.length > 0
                        ? item.contractUnits.slice(0, 2).join(', ')
                        : '완료건 없음'}
                    </div>
                  </div>
                </div>

                {/* Footer: Date & Action */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    최근 실적일: <strong className="text-slate-600">{item.latestDate}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedMember(item.member)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-blue-600 shadow-xs hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer min-h-[38px]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>실적 대장 상세</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="font-semibold">조회된 팀원이 없거나 등록된 실적이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Member Performance Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          team={selectedTeam}
          yearMonth={selectedYearMonth}
          viewMode={viewMode}
          performances={performances.filter(
            (p) =>
              p.employeeId === selectedMember.uid &&
              (viewMode === 'month'
                ? p.yearMonth === selectedYearMonth
                : p.yearMonth.startsWith(selectedYearMonth.substring(0, 4)))
          )}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};

// Modal for detailed member breakdown
interface MemberDetailModalProps {
  member: UserProfile;
  team: string;
  yearMonth: string;
  viewMode: 'month' | 'year';
  performances: PerformanceRecord[];
  onClose: () => void;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  team,
  yearMonth,
  viewMode,
  performances,
  onClose,
}) => {
  const visitorPerfs = performances.filter((p) => p.type === 'visitor');
  const contractPerfs = performances.filter((p) => p.type === 'contract');

  const totalVisitors = visitorPerfs
    .filter((p) => p.status !== 'cancelled')
    .reduce((acc, cur) => acc + (cur.visitorCount || 1), 0);

  const totalContracts = contractPerfs
    .filter((p) => p.status !== 'cancelled')
    .reduce((acc, cur) => acc + (cur.contractCount || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-black text-slate-950 text-sm shadow-md">
              {member.name.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{member.name}</h3>
                <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                  {member.position}
                </span>
                <span className="text-xs text-slate-400">({team})</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                사번: {member.employeeNumber || '-'} • 담당 현장: {member.assignedSite || '전사 통합'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Subheader Summary */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border-b border-slate-200 text-center">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <div className="text-[11px] font-bold text-blue-800">
              {viewMode === 'month' ? `${yearMonth}월` : `${yearMonth.substring(0, 4)}년`} 총 내방객 수
            </div>
            <div className="text-2xl font-black text-blue-900 mt-1">{totalVisitors}명</div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="text-[11px] font-bold text-amber-800">
              {viewMode === 'month' ? `${yearMonth}월` : `${yearMonth.substring(0, 4)}년`} 총 계약 실적
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{totalContracts}건 완료</div>
          </div>
        </div>

        {/* Modal Body: Performance Records List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-blue-600" />
            등록된 실적 일지 목록 ({performances.length}건)
          </h4>

          {performances.length > 0 ? (
            <div className="space-y-3">
              {performances.map((perf) => (
                <div
                  key={perf.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    perf.status === 'cancelled'
                      ? 'border-slate-200 bg-slate-50/80 opacity-60'
                      : perf.type === 'contract'
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-blue-200 bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                          perf.type === 'contract'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {perf.type === 'contract' ? '계약 체결' : '고객 내방'}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{perf.date}</span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-xs text-slate-600 font-semibold">{perf.siteName}</span>
                    </div>

                    <div>
                      {perf.status === 'cancelled' ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          취소 처리됨
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          정상 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 text-xs text-slate-700">
                    {perf.type === 'contract' ? (
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <span>계약 식별(동호수):</span>
                        <span className="rounded bg-amber-200/80 px-2 py-0.5 font-black text-amber-950">
                          {perf.contractIdentifier || '미지정'}
                        </span>
                        <span>(수량: {perf.contractCount || 1}건)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 font-semibold text-blue-900">
                        <span>내방객 수:</span>
                        <strong className="text-sm font-black">{perf.visitorCount || 1}명</strong>
                        <span className="text-slate-400">•</span>
                        <span>유형: {perf.visitorType === 'revisit' ? '재방문' : '신규 내방'}</span>
                        {perf.funnelSource && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span>유입: {perf.funnelSource}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {perf.memo && (
                    <div className="mt-2 text-xs text-slate-600 bg-white/80 rounded-xl p-2.5 border border-slate-200/60">
                      <strong>메모:</strong> {perf.memo}
                    </div>
                  )}

                  {perf.cancelReason && (
                    <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-xl p-2.5 border border-rose-200">
                      <strong>취소 사유:</strong> {perf.cancelReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
              해당 기간에 등록된 실적 내역이 없습니다.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold transition-all cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
