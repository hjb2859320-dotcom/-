import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Clock,
  FileCheck2,
  Users2,
  TrendingUp,
  Download,
  PlusCircle,
  Building,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  getAllPerformances,
  exportPerformancesToCsv,
} from '../../services/db';
import type { UserProfile, PerformanceRecord } from '../../types';
import { MonthlyPerformanceChart } from '../dashboard/MonthlyPerformanceChart';

interface AdminDashboardProps {
  onNavigate: (menu: string) => void;
  onOpenRegister: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenRegister,
}) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [performances, setPerformances] = useState<PerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, pList] = await Promise.all([
        getAllUsers(),
        getAllPerformances(),
      ]);
      setUsers(uList || []);
      setPerformances(pList || []);
    } catch (err) {
      console.error(err);
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
    window.addEventListener('leedo_users_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leedo_performances_updated', handleUpdate);
      window.removeEventListener('leedo_users_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const pendingEmployees = users.filter((u) => u.status === 'pending');
  const activeEmployees = users.filter((u) => u.status === 'active');

  const currentMonthPerfs = performances.filter((p) => p.yearMonth === currentYearMonth);
  const currentContracts = currentMonthPerfs
    .filter((p) => p.type === 'contract')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const currentValidContracts = currentMonthPerfs
    .filter((p) => p.type === 'contract' && p.status === 'completed')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const currentCancelled = currentMonthPerfs
    .filter((p) => p.type === 'contract' && p.status === 'cancelled')
    .reduce((sum, p) => sum + (p.contractCount || 1), 0);

  const currentVisitors = currentMonthPerfs
    .filter((p) => p.type === 'visitor')
    .reduce((sum, p) => sum + (p.visitorCount || 0), 0);

  const handleExportAll = () => {
    exportPerformancesToCsv(
      performances,
      `LEEDO_전체직원_실적총람_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-linear-to-r from-[#0F1E36] via-[#162B4E] to-slate-900 p-6 text-white shadow-xl border border-slate-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
              <ShieldCheck className="h-3.5 w-3.5" />
              최고 관리자 콘솔
            </span>
            <span className="text-xs text-slate-300">
              로그인: {profile?.name} {profile?.position}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            (주)이도 회사 전체 통합 분양 실적 및 직원 관리 센터
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            직원 등록 승인, 현장별 계약 통계, 부정/중복 등록 모니터링 및 엑셀 정산 데이터를 관리합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingEmployees.length > 0 && (
            <button
              onClick={() => onNavigate('admin_employees')}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors cursor-pointer"
            >
              <Clock className="h-4 w-4 animate-spin" />
              <span>승인 대기 {pendingEmployees.length}건 처리</span>
            </button>
          )}

          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-600 px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-300" />
            <span>회사 전체 실적 엑셀 다운로드</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Employees */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">전체 재직 직원</span>
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{activeEmployees.length}</span>
            <span className="text-xs font-semibold text-slate-500">명</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            등록 총 {users.length}계정
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigate('admin_employees')}
          className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4 shadow-xs hover:bg-amber-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold">승인 대기 직원</span>
            <div className="rounded-lg bg-amber-400 p-1.5 text-slate-950">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-950">
              {pendingEmployees.length}
            </span>
            <span className="text-xs font-bold text-amber-800">명</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            클릭하여 신원 확인 및 승인 &gt;
          </div>
        </div>

        {/* Current Month Valid Contracts */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-xs font-bold">당월 회사 전체 유효 계약</span>
            <div className="rounded-lg bg-blue-600 p-1.5 text-white">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-950">{currentValidContracts}</span>
            <span className="text-xs font-bold text-blue-800">건</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-700">
            총 {currentContracts}건 중 취소 {currentCancelled}건 제외
          </div>
        </div>

        {/* Current Month Visitors */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">당월 회사 전체 내방객</span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{currentVisitors}</span>
            <span className="text-xs font-semibold text-slate-500">명</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            전 분양 현장 모델하우스 집계
          </div>
        </div>

        {/* Total Records Registered */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">누적 전산 실적건수</span>
            <div className="rounded-lg bg-slate-100 p-1.5 text-slate-700">
              <Building className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{performances.length}</span>
            <span className="text-xs font-semibold text-slate-500">건</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            전체 감사 로그 보관 중
          </div>
        </div>
      </div>

      {/* Main Charts: Overall Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MonthlyPerformanceChart records={performances} />
        </div>

        {/* Quick Pending Approvals Queue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-xs">최근 직원 가입 신청 대기</h3>
              </div>
              <button
                onClick={() => onNavigate('admin_employees')}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                전체 관리 &gt;
              </button>
            </div>

            <div className="mt-3 space-y-2.5">
              {pendingEmployees.slice(0, 4).map((pe) => (
                <div
                  key={pe.uid}
                  className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {pe.name} <span className="font-normal text-slate-500">({pe.employeeNumber})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {pe.department} | {pe.assignedSite}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('admin_employees')}
                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-500"
                  >
                    심사
                  </button>
                </div>
              ))}

              {pendingEmployees.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  대기 중인 직원 등록 신청이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>승인 시 직원에게 즉시 실적 포털 권한이 부여됩니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
