import React, { useState } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeedoLogo } from '../common/LeedoLogo';

interface LoginViewProps {
  onGoToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onGoToRegister }) => {
  const { loginWithCredentials, loading } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginId.trim()) {
      setErrorMsg('아이디를 입력해 주세요.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithCredentials(loginId.trim(), password.trim(), rememberMe);
      if (!res.success) {
        setErrorMsg(res.error || '아이디 또는 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
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
              이도 업무포털 - 임직원 전용 실적관리 시스템
            </p>
          </div>

          {/* Security Banner */}
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-950/40 p-3 text-xs text-blue-200">
            <ShieldCheck className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
            <p className="leading-relaxed">
              본 시스템은 이도 소속 임직원 전용 인트라넷입니다. 관리자 승인을 받은 발급 계정으로 로그인해 주세요.
            </p>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Credentials Login Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                아이디
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                />
                <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/90 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                />
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Auto Login Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-400 cursor-pointer accent-amber-500"
                />
                <span className="font-medium text-slate-300">자동 로그인</span>
              </label>
              <span className="text-[11px] text-slate-500">안전한 세션 유지</span>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>{isSubmitting ? '로그인 확인 중...' : '사내 시스템 로그인'}</span>
            </button>
          </form>

          {/* Register Application Button */}
          <div className="mt-5 pt-4 border-t border-slate-700/80">
            <button
              onClick={onGoToRegister}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-amber-400" />
              <span>신규 직원 등록 신청</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* Footer note: strictly '주식회사 이도' */}
          <div className="mt-7 text-center text-xs font-semibold text-slate-500 tracking-wider">
            주식회사 이도
          </div>
        </div>
      </div>
    </div>
  );
};
