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
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getEmployeeOfTheMonthList,
  saveEmployeeOfTheMonth,
  deleteEmployeeOfTheMonth,
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
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    yearMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    selectedEmployeeUid: '',
    criteriaCategory: 'contract' as AwardCriteria,
    reason: '',
    isPublic: true,
  });

  // Delete State
  const [awardToDelete, setAwardToDelete] = useState<EmployeeOfTheMonth | null>(null);
  const [deletingAward, setDeletingAward] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, userList] = await Promise.all([
        getEmployeeOfTheMonthList(),
        isAdmin ? getAllUsers() : Promise.resolve([]),
      ]);
      setAwards(list || []);
      setUsers(userList || []);
      if (userList && userList.length > 0 && !formData.selectedEmployeeUid) {
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
    const handleUpdate = () => loadData();
    window.addEventListener('leedo_star_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leedo_star_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [isAdmin]);

  const [awardError, setAwardError] = useState<string | null>(null);

  const handleOpenRegister = () => {
    setEditingAwardId(null);
    setFormData({
      yearMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      selectedEmployeeUid: users[0]?.uid || '',
      criteriaCategory: 'contract',
      reason: '',
      isPublic: true,
    });
    setAwardError(null);
    setIsSelecting(true);
  };

  const handleOpenEdit = (a: EmployeeOfTheMonth) => {
    setEditingAwardId(a.id);
    setFormData({
      yearMonth: a.yearMonth,
      selectedEmployeeUid: a.employeeId,
      criteriaCategory: a.criteriaCategory,
      reason: a.reason,
      isPublic: a.isPublic,
    });
    setAwardError(null);
    setIsSelecting(true);
  };

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
      const awardId = editingAwardId || `star_${formData.yearMonth}_${Date.now()}`;
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
      setEditingAwardId(null);
      await loadData();
      showToast(editingAwardId ? '우수직원 정보가 수정되었습니다.' : '이달의 우수직원이 등록되었습니다.');
    } catch (err) {
      console.error(err);
      setAwardError('이달의 직원 선정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!awardToDelete) return;
    setDeletingAward(true);
    try {
      await deleteEmployeeOfTheMonth(awardToDelete.id);
      setAwardToDelete(null);
      await loadData();
      showToast('이달의 우수직원 선정이 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('삭제 처리 중 오류가 발생했습니다.');
    } finally {
      setDeletingAward(false);
    }
  };

  const visibleAwards = isAdmin ? awards : awards.filter((a) => a.isPublic);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-amber-400 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer min-h-[40px]"
            title="새로고침"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>새로고침</span>
          </button>
          {isAdmin && (
            <button
              onClick={handleOpenRegister}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors cursor-pointer min-h-[40px]"
            >
              <Award className="h-4 w-4" />
              <span>우수직원 선정 (관리자)</span>
            </button>
          )}
        </div>
      </div>

      {/* Awards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {visibleAwards.length > 0 ? (
          visibleAwards.map((a, idx) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 sm:p-6 shadow-xs flex flex-col justify-between transition-all ${
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
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold flex items-center gap-1 ${
                          a.isPublic ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {a.isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        <span>{a.isPublic ? '회사 전체 공개' : '비공개'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="우수직원 내용 수정"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setAwardToDelete(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="우수직원 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                <h3 className="font-bold text-sm">
                  {editingAwardId ? '이달의 우수직원 선정 내역 수정' : '이달의 직원 심사 및 선정'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsSelecting(false);
                  setEditingAwardId(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAward} className="p-6 space-y-4">
              {awardError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  {awardError}
                </div>
              )}

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
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500"
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
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500"
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-amber-500"
                >
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.employeeNumber} - {u.team || u.department} / {u.position})
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
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-amber-500"
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
                  onClick={() => {
                    setIsSelecting(false);
                    setEditingAwardId(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 cursor-pointer"
                >
                  {editingAwardId ? '수정 내용 저장' : '이달의 직원 확정 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Award Confirmation Modal */}
      {awardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-6 py-4">
              <div className="flex items-center gap-2 text-rose-700">
                <Trash2 className="h-5 w-5" />
                <h3 className="font-bold text-sm">우수직원 선정 내역 삭제</h3>
              </div>
              <button
                onClick={() => setAwardToDelete(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>해당 우수직원 선정을 삭제하시겠습니까?</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  삭제 시 명예의 전당 및 메인 대시보드에서 즉시 제외되며 데이터베이스에서도 영구 삭제됩니다.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">선정 연월:</span>
                  <span className="font-bold text-slate-900">{awardToDelete.yearMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">선정 직원:</span>
                  <span className="font-bold text-slate-900">
                    {awardToDelete.employeeName} ({awardToDelete.position || '직원'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">소속 / 현장:</span>
                  <span className="font-bold text-slate-900">
                    {awardToDelete.team || awardToDelete.department} | {awardToDelete.assignedSite}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAwardToDelete(null)}
                  disabled={deletingAward}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deletingAward}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 font-bold text-white shadow-md hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deletingAward ? '삭제 중...' : '우수직원 삭제 실행'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
