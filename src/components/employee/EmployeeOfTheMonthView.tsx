import React, { useState, useEffect } from 'react';
import {
  Award,
  Calendar,
  Building,
  User,
  Star,
  Plus,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getEmployeeOfTheMonthList,
  saveEmployeeOfTheMonth,
  getAllUsers,
} from '../../services/db';
import type { EmployeeOfTheMonth, UserProfile, AwardCriteria } from '../../types';

export const EmployeeOfTheMonthView: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [awards, setAwards] = useState<EmployeeOfTheMonth[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin Modal
  const [isSelecting, setIsSelecting] = useState(false);
  const [formData, setFormData] = useState({
    yearMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    selectedEmployeeUid: '',
    criteriaCategory: 'contract' as AwardCriteria,
    reason: '',
    isPublic: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, userList] = await Promise.all([
        getEmployeeOfTheMonthList(),
        isAdmin ? getAllUsers() : Promise.resolve([]),
      ]);
      setAwards(list || []);
      setUsers(userList || []);
      if (userList && userList.length > 0) {
        setFormData((prev) => ({ ...prev, selectedEmployeeUid: userList[0].uid }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const [awardError, setAwardError] = useState<string | null>(null);

  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setAwardError(null);

    const chosenEmp = users.find((u) => u.uid === formData.selectedEmployeeUid);
    if (!chosenEmp) {
      setAwardError('대상 직원을 선택해 주세요.');
      return;
    }
    if (!formData.reason.trim()) {
      setAwardError('선정 사유를 입력해 주세요.');
      return;
    }

    try {
      const awardId = `star_${formData.yearMonth}`;
      const awardToSave: EmployeeOfTheMonth = {
        id: awardId,
        yearMonth: formData.yearMonth,
        employeeId: chosenEmp.uid,
        employeeName: chosenEmp.name,
        team: chosenEmp.team || chosenEmp.department || '영업1팀',
        department: chosenEmp.team || chosenEmp.department || '영업1팀',
        assignedSite: chosenEmp.assignedSite,
        position: chosenEmp.position,
        criteriaCategory: formData.criteriaCategory,
        reason: formData.reason.trim(),
        isPublic: formData.isPublic,
        awardedBy: profile.name,
        awardedAt: new Date().toISOString(),
      };

      await saveEmployeeOfTheMonth(awardToSave);
      setIsSelecting(false);
      await loadData();
    } catch (err) {
      console.error(err);
      setAwardError('이달의 직원 선정 저장 중 오류가 발생했습니다.');
    }
  };

  const visibleAwards = isAdmin ? awards : awards.filter((a) => a.isPublic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">이도 명예의 전당 (이달의 우수직원)</h2>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              LEEDO Star Employee
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            뛰어난 분양 계약 실적과 고객 유치, 조직 헌신을 보여준 당월의 주역을 축하합니다.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsSelecting(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Award className="h-4 w-4" />
            <span>이달의 직원 선정하기 (관리자)</span>
          </button>
        )}
      </div>

      {/* Awards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleAwards.length > 0 ? (
          visibleAwards.map((a, idx) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-all ${
                idx === 0
                  ? 'border-amber-300 bg-linear-to-b from-amber-50/70 via-white to-white ring-2 ring-amber-200'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-amber-400">
                    <Calendar className="h-3 w-3" />
                    <span>{a.yearMonth} 선정</span>
                  </span>

                  {isAdmin && (
                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        a.isPublic ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {a.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span>{a.isPublic ? '전사 공개' : '비공개'}</span>
                    </span>
                  )}
                </div>

                <div className="mt-5 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 text-2xl font-black shadow-lg ring-4 ring-amber-100">
                    {a.employeeName.charAt(0)}
                  </div>
                  <h3 className="mt-3 font-bold text-lg text-slate-900">
                    {a.employeeName} {a.position || '직원'}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {a.team || a.department} | {a.assignedSite}
                  </div>

                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span>
                      {a.criteriaCategory === 'contract'
                        ? '분양 계약 최우수 실적'
                        : a.criteriaCategory === 'visitor'
                        ? '내방 고객 최다 유치'
                        : '영업 지원 및 조직 공헌'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed italic">
                  "{a.reason}"
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex justify-between">
                <span>선정자: {a.awardedBy || '인사위원회'}</span>
                <span>{new Date(a.awardedAt).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            등록된 우수직원 내역이 없습니다.
          </div>
        )}
      </div>

      {/* Admin Selection Modal */}
      {isSelecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">이달의 직원 심사 및 선정</h3>
              </div>
              <button
                onClick={() => setIsSelecting(false)}
                className="text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleSaveAward} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    선정 대상 연월
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.yearMonth}
                    onChange={(e) => setFormData({ ...formData, yearMonth: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    우수 부문 (선정 기준)
                  </label>
                  <select
                    value={formData.criteriaCategory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        criteriaCategory: e.target.value as AwardCriteria,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  >
                    <option value="contract">계약 실적 최우수</option>
                    <option value="visitor">내방객 유치 최우수</option>
                    <option value="contribution">조직 및 영업 공헌도</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  대상 직원 선택 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.selectedEmployeeUid}
                  onChange={(e) =>
                    setFormData({ ...formData, selectedEmployeeUid: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                >
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.employeeNumber} - {u.department} / {u.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  선정 사유 및 주요 성과 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="예: 송도 대형 평형 단독 최다 계약(월 7건) 달성 및 신규 상담사 전산 교육 기여"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    전체 직원 메인 대시보드에 즉시 공개
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSelecting(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400"
                >
                  이달의 직원 확정 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
