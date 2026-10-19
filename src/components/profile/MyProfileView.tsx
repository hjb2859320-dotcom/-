import React, { useState } from 'react';
import {
  User,
  Shield,
  Building2,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Lock,
  Edit2,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/db';
import { LeedoLogo } from '../common/LeedoLogo';

export const MyProfileView: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isExecutive = ['대표', '이사', '본부장'].includes(profile?.position || '');

  const handleSavePhone = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateUserProfile(profile.uid, { phoneNumber: phoneNumber.trim() });
      await refreshProfile();
      setIsEditingPhone(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">내 정보 및 사원 인증</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          (주)이도 사내 인트라넷 인사 정보 및 계정 보안 설정을 확인합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Digital ID Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#0F1E36] p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-80">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LeedoLogo size="sm" showText={false} />
                <span className="font-extrabold text-xs tracking-wider text-amber-400">
                  LEEDO IDENTIFICATION
                </span>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                정규 승인
              </span>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black text-slate-950 shadow-md border ${
                  isExecutive
                    ? 'bg-linear-to-br from-amber-400 to-amber-600 border-amber-300'
                    : 'bg-slate-700 text-white border-slate-600'
                }`}
              >
                {profile?.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{profile?.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {profile?.position}
                  </span>
                </h3>
                <div className="text-xs text-amber-400 font-semibold mt-1">
                  {profile?.team || profile?.department || '영업팀'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-slate-400">접속 아이디 (ID)</div>
              <div className="font-mono font-bold text-white text-sm">{profile?.loginId || '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">승인 일자</div>
              <div className="text-slate-300 font-medium">
                {profile?.approvedAt
                  ? new Date(profile.approvedAt).toLocaleDateString('ko-KR')
                  : '정상 승인'}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Info Details */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
            상세 인사 정보
          </h3>

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>연락처 정보가 성공적으로 업데이트되었습니다.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-1">성명 및 직급</span>
              <span className="font-bold text-slate-900 text-sm">
                {profile?.name} {profile?.position}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-1">접속 아이디</span>
              <span className="font-mono font-bold text-blue-700 text-sm">
                {profile?.loginId || '-'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-1">소속 팀</span>
              <span className="font-semibold text-slate-800">
                {profile?.team || profile?.department || '영업팀'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block mb-1">담당 분양 사업지</span>
              <span className="font-semibold text-slate-800">{profile?.assignedSite}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">휴대전화 번호</span>
                {!isEditingPhone ? (
                  <button
                    onClick={() => setIsEditingPhone(true)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>수정</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingPhone(false)}
                      className="text-[11px] text-slate-500"
                    >
                      취소
                    </button>
                    <button
                      disabled={saving}
                      onClick={handleSavePhone}
                      className="text-[11px] font-bold text-blue-600"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </div>

              {!isEditingPhone ? (
                <div className="font-semibold text-slate-800">{profile?.phoneNumber}</div>
              ) : (
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 outline-none"
                />
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
              <span className="text-slate-500 block mb-1">연동 계정 이메일</span>
              <span className="font-medium text-slate-800">{profile?.email}</span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            * 소속 팀 이동 및 담당 분양 현장 변경은 관리자를 통해서만 변경 가능합니다.
          </div>
        </div>
      </div>
    </div>
  );
};
