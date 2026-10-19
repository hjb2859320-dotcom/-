import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  UserCheck,
  Shield,
  Edit2,
  RotateCcw,
  Clock,
  Phone,
  Mail,
  X,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  approveUserRegistration,
  rejectUserRegistration,
  setUserAccountStatus,
  updateUserProfile,
  getProjectSites,
  getCompanyTeams,
} from '../../services/db';
import type { UserProfile, ProjectSite, CompanyTeam, AllowedPosition } from '../../types';

const POSITIONS: AllowedPosition[] = ['대표', '이사', '본부장', '실장', '과장', '대리', '주임', '관리자'];

export const AdminEmployeeManagement: React.FC = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [companyTeams, setCompanyTeams] = useState<CompanyTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'deactivated'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Modals
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [editTeam, setEditTeam] = useState('');
  const [editSite, setEditSite] = useState('');
  const [editPosition, setEditPosition] = useState<AllowedPosition>('과장');
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, sList, tList] = await Promise.all([
        getAllUsers(),
        getProjectSites(),
        getCompanyTeams(),
      ]);
      setUsers(uList || []);
      setProjectSites(sList || []);
      setCompanyTeams(tList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (targetUser: UserProfile) => {
    if (!profile) return;
    try {
      const isExec = ['대표', '이사', '본부장'].includes(targetUser.position);
      await approveUserRegistration(targetUser.uid, profile.name, isExec ? 'admin' : 'employee');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    try {
      await rejectUserRegistration(rejectingUser.uid, rejectReason.trim());
      setRejectingUser(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      await setUserAccountStatus(user.uid, nextStatus);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    try {
      const isExec = ['대표', '이사', '본부장'].includes(editPosition);
      await updateUserProfile(userToEdit.uid, {
        team: editTeam,
        department: editTeam,
        assignedSite: editSite,
        position: editPosition,
        role: isExec ? 'admin' : userToEdit.role,
      });
      setUserToEdit(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = u.name.toLowerCase().includes(kw);
      const matchNum = u.employeeNumber.toLowerCase().includes(kw);
      const matchTeam = (u.team || u.department || '').toLowerCase().includes(kw);
      const matchSite = u.assignedSite.toLowerCase().includes(kw);
      const matchPos = (u.position || '').toLowerCase().includes(kw);
      if (!matchName && !matchNum && !matchTeam && !matchSite && !matchPos) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">직원 등록 및 계정 승인 관리</h2>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-slate-950 animate-bounce">
                승인 대기 {pendingCount}건
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            사번 및 분양 현장 소속 팀을 확인하고 전산 접근을 승인하거나 차단(퇴사자 처리)합니다.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              전체 ({users.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              승인 대기 ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              정상 재직 ({users.filter((u) => u.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              승인 거절 ({users.filter((u) => u.status === 'rejected').length})
            </button>
            <button
              onClick={() => setStatusFilter('deactivated')}
              className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                statusFilter === 'deactivated'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              비활성/퇴사 ({users.filter((u) => u.status === 'deactivated').length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="이름, 사번, 팀, 직급, 현장 검색"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">직원명</th>
                <th className="px-4 py-3.5">사번</th>
                <th className="px-4 py-3.5">소속 팀 / 직급</th>
                <th className="px-4 py-3.5">담당 분양 현장</th>
                <th className="px-4 py-3.5">연락처 / 이메일</th>
                <th className="px-4 py-3.5 text-center">계정 상태</th>
                <th className="px-4 py-3.5 text-center">승인 및 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isExec = ['대표', '이사', '본부장'].includes(u.position);
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs ${
                              isExec
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : 'bg-slate-900 text-white'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {isExec && (
                              <span className="ml-1.5 rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[9px] font-black">
                                임원
                              </span>
                            )}
                            {u.role === 'admin' && !isExec && (
                              <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.2 text-[9px] font-bold text-indigo-700">
                                관리자
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {u.employeeNumber}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{u.team || u.department}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="font-bold text-slate-900">{u.position}</span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {u.assignedSite}
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-slate-500 whitespace-nowrap">
                        <div>{u.phoneNumber}</div>
                        <div className="text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 animate-pulse'
                              : u.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {u.status === 'active'
                            ? '정상 승인'
                            : u.status === 'pending'
                            ? '승인 대기'
                            : u.status === 'rejected'
                            ? '승인 거절'
                            : '비활성화(차단)'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {u.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApprove(u)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-500 cursor-pointer"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => setRejectingUser(u)}
                                className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                반려
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setUserToEdit(u);
                                  setEditTeam(u.team || u.department || '영업1팀');
                                  setEditSite(u.assignedSite);
                                  setEditPosition((u.position as AllowedPosition) || '과장');
                                }}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="소속 팀 및 직급 변경"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer ${
                                  u.status === 'active'
                                    ? 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {u.status === 'active' ? '접근차단' : '활성화'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    해당 조건의 직원 정보가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Team / Position Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">직원 소속 팀 및 직급 변경</h3>
              <button onClick={() => setUserToEdit(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                <div className="font-bold text-slate-900">{userToEdit.name} ({userToEdit.employeeNumber})</div>
                <div className="text-slate-500 mt-0.5">{userToEdit.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">소속 팀 선택</label>
                <select
                  value={editTeam}
                  onChange={(e) => setEditTeam(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                >
                  {companyTeams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">직급 구분</label>
                <select
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value as AllowedPosition)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none font-bold"
                >
                  {POSITIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos} {['대표', '이사', '본부장'].includes(pos) ? '(임원 권한)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">담당 분양 현장</label>
                <select
                  value={editSite}
                  onChange={(e) => setEditSite(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                >
                  {projectSites.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                >
                  변경사항 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-rose-950 px-6 py-4 text-white">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h3 className="font-bold text-sm">직원 등록 신청 반려</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900">{rejectingUser.name}</strong> 님의 등록 신청을 반려하시겠습니까? 사유는 신청자 화면에 안내됩니다.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">반려 사유</label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="예: 사번 불일치, 인사명부 미확인, 소속 팀 오류 등"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleRejectConfirm}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-500"
                >
                  반려 확정
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
