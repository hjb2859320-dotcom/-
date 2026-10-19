import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Shield,
  User,
  Phone,
  Mail,
  Briefcase,
  BadgeAlert,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCompanyTeams, getProjectSites } from '../../services/db';
import type { CompanyTeam, ProjectSite, AllowedPosition } from '../../types';
import { LeedoLogo } from '../common/LeedoLogo';

interface RegisterViewProps {
  onBackToLogin: () => void;
}

// Strict position choices per user instructions:
// "직원 직급에는 대표, 이사, 본부장, 실장, 과장, 대리, 주임 으로 구분되게 해주고"
const POSITIONS: AllowedPosition[] = ['대표', '이사', '본부장', '실장', '과장', '대리', '주임'];

export const RegisterView: React.FC<RegisterViewProps> = ({ onBackToLogin }) => {
  const { registerProfile, firebaseUser } = useAuth();
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);

  const [formData, setFormData] = useState({
    name: firebaseUser?.displayName || '',
    employeeNumber: '',
    team: '영업1팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '과장' as AllowedPosition,
    phoneNumber: '',
    email: firebaseUser?.email || '',
    agreePrivacy: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    getCompanyTeams().then((tList) => {
      if (tList && tList.length > 0) {
        setTeams(tList);
        setFormData((prev) => ({ ...prev, team: tList[0].name }));
      }
    });

    getProjectSites().then((sList) => {
      if (sList && sList.length > 0) {
        setProjectSites(sList);
        setFormData((prev) => ({ ...prev, assignedSite: sList[0].name }));
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }
    if (!formData.employeeNumber.trim()) {
      setError('사번(직원 식별번호)을 입력해 주세요. 예: LD-2026-0042');
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError('휴대전화 번호를 입력해 주세요.');
      return;
    }
    if (!formData.agreePrivacy) {
      setError('개인정보 수집 및 이용에 동의하셔야 등록 신청이 가능합니다.');
      return;
    }

    setSubmitting(true);
    try {
      await registerProfile({
        name: formData.name.trim(),
        employeeNumber: formData.employeeNumber.trim().toUpperCase(),
        team: formData.team,
        department: formData.team,
        assignedSite: formData.assignedSite,
        position: formData.position,
        phoneNumber: formData.phoneNumber.trim(),
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error(err);
      setError('직원 등록 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const isExecutiveCandidate = ['대표', '이사', '본부장'].includes(formData.position);

  if (isSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-800 p-8 shadow-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">직원 등록 신청 완료</h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            사번 <span className="font-bold text-amber-400">{formData.employeeNumber}</span> 등록 신청이 정상 접수되었습니다.
            <br />
            관리자가 신원 및 소속을 검토한 후 승인하면 모든 실적 관리 포털 기능을 정상 이용하실 수 있습니다.
          </p>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">직원명 / 직급:</span>
              <span className="font-semibold text-white">
                {formData.name} {formData.position}
                {isExecutiveCandidate && (
                  <span className="ml-1 text-[10px] text-amber-400 font-bold">(임원 권한 예정)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">소속 팀:</span>
              <span className="font-semibold text-white">{formData.team}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">담당 분양 현장:</span>
              <span className="font-semibold text-white">{formData.assignedSite}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">계정 상태:</span>
              <span className="font-bold text-amber-400">관리자 승인 대기 중</span>
            </div>
          </div>
          <button
            onClick={onBackToLogin}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
          >
            로그인 화면으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-800 p-8 shadow-2xl">
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>로그인 화면으로 돌아가기</span>
        </button>

        <div className="border-b border-slate-700/80 pb-4">
          <div className="flex items-center justify-between">
            <LeedoLogo size="md" showText={true} lightText={true} />
            <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              신규 사번 등록
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            실적 관리 시스템을 이용하기 위해 본인의 사번과 소속 팀, 직급 정보를 입력해 주세요.
          </p>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                직원 성명 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 홍길동"
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                사번 / 직원 식별번호 <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employeeNumber}
                onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                placeholder="예: LD-2026-0042"
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                소속 팀 <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                직급 구분 <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value as AllowedPosition })
                }
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos} {['대표', '이사', '본부장'].includes(pos) ? '(임원 - 관리자 권한)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              담당 분양 현장 <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.assignedSite}
              onChange={(e) => setFormData({ ...formData, assignedSite: e.target.value })}
              className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              {projectSites.map((site) => (
                <option key={site.id} value={site.name}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                휴대전화 번호 <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="010-0000-0000"
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                사내 또는 연락 이메일
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@leedo.co.kr"
                className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {isExecutiveCandidate && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-start gap-2">
              <Crown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>{formData.position}</strong> 직급은 승인 완료 시 일반 실적 메뉴와 함께 관리자 전용 시스템(직원 승인, 전사 통계)도 열람할 수 있습니다.
              </span>
            </div>
          )}

          {/* Privacy agreement */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3.5 text-xs text-slate-300">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreePrivacy}
                onChange={(e) => setFormData({ ...formData, agreePrivacy: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="leading-relaxed text-[11px] text-slate-300">
                [필수] (주)이도 사내 인트라넷 이용을 위한 직원 식별정보(성명, 사번, 연락처, 소속 팀, 분양현장 등) 수집 및 이용에 동의합니다.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitting ? '등록 신청 중...' : '직원 등록 신청 완료 (승인 대기)'}
          </button>
        </form>
      </div>
    </div>
  );
};
