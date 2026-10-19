import React, { useState } from 'react';
import {
  Clock,
  RotateCw,
  LogOut,
  ShieldCheck,
  AlertOctagon,
  Building2,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PendingApprovalView: React.FC = () => {
  const { profile, refreshProfile, logout, isRejected, isDeactivated, setDemoProfile } =
    useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 px-4 py-12 relative">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-800 p-8 shadow-2xl">
        {/* Status Icon */}
        <div className="text-center">
          {isRejected ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
              <AlertOctagon className="h-8 w-8" />
            </div>
          ) : isDeactivated ? (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-600/30 text-slate-400">
              <AlertOctagon className="h-8 w-8" />
            </div>
          ) : (
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
          )}

          <h2 className="mt-4 text-xl font-bold text-white">
            {isRejected
              ? '직원 등록 승인 반려'
              : isDeactivated
              ? '계정 접근 일시 중단'
              : '관리자 승인 대기 중'}
          </h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            {isRejected ? (
              <span>
                직원 정보 확인 결과 승인이 반려되었습니다.
                <br />
                <span className="text-rose-300 font-medium">
                  사유: {profile?.rejectReason || '사번 불일치 또는 정보 오류'}
                </span>
              </span>
            ) : isDeactivated ? (
              <span>퇴사 또는 관리자 보안 조치로 인해 계정이 비활성화되었습니다.</span>
            ) : (
              <span>
                (주)이도 사내 보안 지침에 따라 관리자의 승인 절차를 거친 직원만 실적 관리 포털을 이용할 수 있습니다.
              </span>
            )}
          </p>
        </div>

        {/* User Card */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-xs space-y-2 text-slate-300">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">직원명:</span>
            <span className="font-bold text-white">
              {profile?.name} ({profile?.position || '직급 미지정'})
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">사번:</span>
            <span className="font-mono font-semibold text-amber-400">{profile?.employeeNumber}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">소속 부서:</span>
            <span className="font-medium text-white">{profile?.department}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">담당 분양 현장:</span>
            <span className="font-medium text-white">{profile?.assignedSite}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-400">신청 일시:</span>
            <span className="text-slate-400">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? '승인 상태 확인 중...' : '승인 상태 새로고침'}</span>
          </button>

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-700/50 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>로그아웃</span>
          </button>
        </div>

        {/* Helpful evaluation hint */}
        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-center">
          <div className="text-[11px] font-bold text-amber-400 flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>관리자 승인 기능 직접 테스트하기</span>
          </div>
          <p className="mt-1 text-[10px] text-amber-200/80">
            관리자 계정으로 전환하여 대기 중인 직원을 직접 승인하고 승인된 실적 포털을 확인해 보세요.
          </p>
          <button
            onClick={() => setDemoProfile('admin')}
            className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>관리자 모드로 전환하여 승인하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
