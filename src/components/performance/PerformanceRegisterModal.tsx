import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  Users2,
  AlertCircle,
  CheckCircle2,
  Building,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  registerPerformance,
  checkDuplicateContract,
  getProjectSites,
} from '../../services/db';
import type {
  PerformanceRecord,
  PerformanceType,
  VisitorCategory,
  ProjectSite,
} from '../../types';

interface PerformanceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FUNNEL_SOURCES = [
  '온라인 / SNS 광고',
  '전화 / 사전 예약',
  '현수막 / 전단 배포',
  '지인 / 기계약자 추천',
  '워킹 / 직접 방문',
  '협력업체 / 중개업소 연계',
  '기타',
];

export const PerformanceRegisterModal: React.FC<PerformanceRegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [perfType, setPerfType] = useState<PerformanceType>('contract');
  const [date, setDate] = useState(todayStr);
  const [siteName, setSiteName] = useState(profile?.assignedSite || '힐스테이트 센트럴 송도');

  // Contract specific fields
  const [contractIdentifier, setContractIdentifier] = useState('');
  const [contractCount, setContractCount] = useState<number>(1);
  const [status, setStatus] = useState<'completed' | 'cancelled'>('completed');

  // Visitor specific fields
  const [visitorCount, setVisitorCount] = useState<number>(1);
  const [visitorType, setVisitorType] = useState<VisitorCategory>('new');
  const [funnelSource, setFunnelSource] = useState(FUNNEL_SOURCES[0]);

  // General
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getProjectSites().then((sites) => {
        if (sites && sites.length > 0) {
          setProjectSites(sites);
          if (profile?.assignedSite) {
            setSiteName(profile.assignedSite);
          } else {
            setSiteName(sites[0].name);
          }
        }
      });
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setContractIdentifier('');
      setContractCount(1);
      setVisitorCount(1);
      setMemo('');
      setError(null);
      setDuplicateWarning(null);
      setShowConfirm(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleValidateAndPreConfirm = async () => {
    setError(null);
    setDuplicateWarning(null);

    if (!date) {
      setError('실적 발생일자를 선택해 주세요.');
      return;
    }
    if (!siteName) {
      setError('분양 현장을 선택해 주세요.');
      return;
    }

    if (perfType === 'contract') {
      if (!contractIdentifier.trim()) {
        setError('동·호수 또는 계약 식별정보를 입력해 주세요. (예: 104동 1205호)');
        return;
      }
      if (!contractCount || contractCount < 1) {
        setError('계약 건수는 1건 이상이어야 합니다.');
        return;
      }

      // Check duplicate contract in this site
      const dup = await checkDuplicateContract(siteName, contractIdentifier.trim());
      if (dup && status === 'completed') {
        setDuplicateWarning(
          `주의: 동일 현장(${siteName})에 이미 완료 처리된 동일 동·호수(${contractIdentifier}) 계약 실적(등록자: ${dup.employeeName})이 존재합니다.`
        );
      }
    } else {
      if (!visitorCount || visitorCount < 1) {
        setError('내방객 수는 1명 이상이어야 합니다.');
        return;
      }
    }

    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    try {
      const perfId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const yearMonth = date.substring(0, 7); // e.g. 2026-10

      const record: PerformanceRecord = {
        id: perfId,
        employeeId: profile.uid,
        employeeName: profile.name,
        employeeNumber: profile.employeeNumber || profile.loginId || 'EMP',
        team: profile.team || profile.department || '영업1팀',
        siteName,
        type: perfType,
        date,
        yearMonth,
        status: perfType === 'contract' ? status : 'completed',
        memo: memo.trim(),
        createdAt: new Date().toISOString(),
      };

      if (perfType === 'contract') {
        record.contractIdentifier = contractIdentifier.trim();
        record.contractCount = Number(contractCount);
      } else {
        record.visitorCount = Number(visitorCount);
        record.visitorType = visitorType;
        record.funnelSource = funnelSource;
      }

      await registerPerformance(record, { uid: profile.uid, name: profile.name });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError('실적 등록 저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black text-sm">
              +
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm">신규 실적 등록</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                (주)이도 부동산 분양대행 실적 전산 입력
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed keep-all">{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span className="leading-relaxed keep-all">{duplicateWarning}</span>
            </div>
          )}

          {showConfirm ? (
            /* Confirmation step */
            <div className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 sm:p-4 text-xs text-blue-900">
                <div className="flex items-center gap-2 font-bold text-blue-950 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="keep-all">실적 등록 전 입력 정보를 최종 확인해 주세요</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed keep-all">
                  저장된 실적은 전산 통계에 즉시 반영되며, 등록 이력(Audit Log)이 기록됩니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">실적 구분:</span>
                  <span className="font-bold text-slate-900">
                    {perfType === 'contract' ? '계약 실적' : '내방객 실적'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">발생 일자:</span>
                  <span className="font-semibold text-slate-800">{date}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">소속 팀:</span>
                  <span className="font-semibold text-slate-800">{profile?.team || '영업팀'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">분양 현장명:</span>
                  <span className="font-semibold text-slate-800">{siteName}</span>
                </div>
                {perfType === 'contract' ? (
                  <>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">동·호수 (식별정보):</span>
                      <span className="font-mono font-bold text-blue-600">{contractIdentifier}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">계약 건수:</span>
                      <span className="font-bold text-slate-900">{contractCount}건</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">진행 상태:</span>
                      <span className={`font-bold ${status === 'completed' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {status === 'completed' ? '계약 완료' : '계약 취소'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">내방객 수:</span>
                      <span className="font-bold text-blue-600">{visitorCount}명</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">내방 구분:</span>
                      <span className="font-semibold text-slate-800">
                        {visitorType === 'new' ? '신규 내방' : '재방문'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">유입 경로:</span>
                      <span className="font-semibold text-slate-800">{funnelSource}</span>
                    </div>
                  </>
                )}
                {memo && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 shrink-0 mr-2">특이 메모:</span>
                    <span className="font-medium text-slate-700 text-right truncate">
                      {memo}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="w-full sm:flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer min-h-[42px]"
                >
                  수정하기
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="w-full sm:flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors disabled:opacity-60 cursor-pointer min-h-[42px]"
                >
                  {submitting ? '저장 중...' : '확인 및 최종 저장'}
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <div className="space-y-4">
              {/* Performance Type Tab Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  실적 구분 <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPerfType('contract')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                      perfType === 'contract'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileCheck2 className="h-4 w-4 shrink-0" />
                    <span>계약 실적</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfType('visitor')}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                      perfType === 'visitor'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users2 className="h-4 w-4 shrink-0" />
                    <span>내방객 실적</span>
                  </button>
                </div>
              </div>

              {/* Date & Site */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    발생 일자 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    분양 현장 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    {projectSites.length > 0 ? (
                      projectSites.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <option value="힐스테이트 센트럴 송도">힐스테이트 센트럴 송도</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Dynamic fields based on perfType */}
              {perfType === 'contract' ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <FileCheck2 className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>계약 세부 항목</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      동·호수 또는 계약 식별정보 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contractIdentifier}
                      onChange={(e) => setContractIdentifier(e.target.value)}
                      placeholder="예: 104동 1205호, 근생 102호"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-medium"
                    />
                    <p className="mt-1 text-[10px] sm:text-[11px] text-slate-500 keep-all">
                      * 고객 개인정보 보호를 위해 고객 실명/주민번호는 입력하지 마시고 동·호수만 입력해 주세요.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        계약 건수 <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={contractCount}
                        onChange={(e) => setContractCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        진행 상태 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'completed' | 'cancelled')}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="completed">계약 완료</option>
                        <option value="cancelled">계약 취소</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Users2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>내방객 세부 항목</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        내방객 수 (명) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={visitorCount}
                        onChange={(e) => setVisitorCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        신규 / 재방문 구분 <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={visitorType}
                        onChange={(e) => setVisitorType(e.target.value as VisitorCategory)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="new">신규 내방</option>
                        <option value="revisit">재방문 상담</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      유입 경로 (선택)
                    </label>
                    <select
                      value={funnelSource}
                      onChange={(e) => setFunnelSource(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 sm:py-2 text-xs text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {FUNNEL_SOURCES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Memo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  실적 관련 메모 (선택)
                </label>
                <textarea
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="상담 특이사항, 청약일정, 프로모션 적용 여부 등"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer min-h-[42px]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleValidateAndPreConfirm}
                  className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer min-h-[42px]"
                >
                  내용 확인 및 다음 단계
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

