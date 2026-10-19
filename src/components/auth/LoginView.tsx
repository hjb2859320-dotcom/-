import React, { useState } from 'react';
import {
  Building2,
  Lock,
  ShieldCheck,
  UserCheck,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeedoLogo } from '../common/LeedoLogo';

interface LoginViewProps {
  onGoToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onGoToRegister }) => {
  const { signInWithGoogle, setDemoProfile, loading } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Google 로그인 중 오류가 발생했거나 창이 닫혔습니다. 다시 시도해 주세요.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo & Headline */}
          <div className="flex flex-col items-center text-center">
            <LeedoLogo size="xl" showText={false} />
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <span className="text-2xl font-bold text-white tracking-tight">이도</span>
              <span className="text-2xl font-black text-amber-400 tracking-wider">LEEDO</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              부동산 분양대행사 임직원 전용 실적관리 시스템
            </p>
          </div>

          {/* Security Banner */}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-xs text-blue-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
            <p className="leading-relaxed">
              본 시스템은 일반 공개 사이트가 아닌 이도 소속 직원 전용 인트라넷입니다. 관리자 승인을 득한 사번만 이용 가능합니다.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Actions */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={signingIn || loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-600 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-md transition-all hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? '로그인 처리 중...' : 'Google 계정으로 사내 로그인'}</span>
            </button>

            <button
              onClick={onGoToRegister}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-700/80 cursor-pointer"
            >
              <span>신규 직원 등록 신청 (사번 등록)</span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Quick Demo Profiles Evaluator Selector */}
          <div className="mt-7 pt-5 border-t border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-3">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                평가자용 1초 원클릭 역할 체험
              </span>
              <span className="text-[11px] text-slate-400">바로 로그인</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Executive */}
              <button
                onClick={() => setDemoProfile('executive')}
                className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/30 p-2.5 text-left text-xs text-amber-100 hover:bg-amber-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>이도원 대표이사 (대표 직급)</span>
                      <span className="rounded bg-amber-400 text-slate-950 text-[9px] px-1 font-black">
                        임원
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-300">
                      대표 직급으로 관리자 전용 시스템도 함께 열람
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
              </button>

              {/* Admin */}
              <button
                onClick={() => setDemoProfile('admin')}
                className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-2.5 text-left text-xs text-indigo-100 hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-[11px]">
                    관
                  </div>
                  <div>
                    <div className="font-bold text-white">김도현 관리자 (경영관리팀)</div>
                    <div className="text-[10px] text-indigo-300">직원 승인, 팀 관리, 전체 실적, 엑셀 다운로드</div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />
              </button>

              {/* Approved Employee */}
              <button
                onClick={() => setDemoProfile('employee')}
                className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-left text-xs text-emerald-100 hover:bg-emerald-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-[11px]">
                    직
                  </div>
                  <div>
                    <div className="font-bold text-white">박서준 과장 (영업1팀)</div>
                    <div className="text-[10px] text-emerald-300">계약/내방 실적 등록, 자료실, 개인일정표</div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </button>

              {/* Pending Employee */}
              <button
                onClick={() => setDemoProfile('pending')}
                className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/50 p-2.5 text-left text-xs text-slate-300 hover:bg-slate-900/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-[11px]">
                    대
                  </div>
                  <div>
                    <div className="font-bold text-white">이지은 대리 (영업2팀)</div>
                    <div className="text-[10px] text-slate-400">신규 등록 후 관리자 승인 대기 화면 체험</div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-6 text-center text-[11px] text-slate-500">
            주식회사 이도 | 사업자등록번호: 214-88-92014 <br />
            서울특별시 강남구 테헤란로 분양사업본부
          </div>
        </div>
      </div>
    </div>
  );
};
