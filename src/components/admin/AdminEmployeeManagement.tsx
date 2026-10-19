import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Shield,
  Clock,
  Eye,
  KeyRound,
  Copy,
  Edit2,
  Trash2,
  X,
  UserCheck,
  Send,
  Building,
  UserPlus,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllUsers,
  approveUserRegistration,
  rejectUserRegistration,
  setUserAccountStatus,
  updateUserProfile,
  updateUserCredentials,
  getProjectSites,
  getCompanyTeams,
  registerEmployeeApplication,
} from '../../services/db';
import type { UserProfile, ProjectSite, CompanyTeam, AllowedPosition } from '../../types';

const POSITIONS: AllowedPosition[] = ['대표', '이사', '본부장', '실장', '과장', '대리', '주임'];

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

  // Credential edit modal
  const [userToEditCreds, setUserToEditCreds] = useState<UserProfile | null>(null);
  const [newLoginId, setNewLoginId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Reject modal
  const [rejectingUser, setRejectingUser] = useState<UserProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Approved Credentials Distribution Modal
  const [distributionModal, setDistributionModal] = useState<{
    isOpen: boolean;
    user: UserProfile;
    loginId: string;
    loginPassword: string;
  } | null>(null);

  // Direct register modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpData, setNewEmpData] = useState({
    name: '',
    team: '영업1팀',
    position: '과장' as AllowedPosition,
    phoneNumber: '',
    assignedSite: '힐스테이트 센트럴 송도',
    applicationNote: '',
  });

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
      const creds = await approveUserRegistration(
        targetUser.uid,
        profile.name,
        isExec ? 'admin' : 'employee'
      );
      await loadData();

      // Show distribution modal with generated credentials
      setDistributionModal({
        isOpen: true,
        user: { ...targetUser, loginId: creds.loginId, loginPassword: creds.loginPassword },
        loginId: creds.loginId,
        loginPassword: creds.loginPassword,
      });
      showToast(`${targetUser.name} 직원이 승인되었습니다. 계정 정보를 배포해 주세요.`);
    } catch (err) {
      console.error(err);
      showToast('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    try {
      await rejectUserRegistration(rejectingUser.uid, rejectReason.trim());
      setRejectingUser(null);
      setRejectReason('');
      await loadData();
      showToast('승인이 반려되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'deactivated' : 'active';
    try {
      await setUserAccountStatus(user.uid, nextStatus);
      await loadData();
      showToast(nextStatus === 'active' ? '계정이 활성화되었습니다.' : '계정이 비활성화(차단)되었습니다.');
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
      showToast('직원 정보가 수정되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCredsEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEditCreds) return;
    if (!newLoginId.trim() || !newPassword.trim()) {
      showToast('아이디와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    try {
      await updateUserCredentials(userToEditCreds.uid, newLoginId.trim(), newPassword.trim());
      setUserToEditCreds(null);
      await loadData();
      showToast('접속 계정 정보가 성공적으로 변경되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpData.name.trim() || !newEmpData.phoneNumber.trim()) {
      showToast('성명과 연락처를 입력해 주세요.');
      return;
    }

    try {
      const result = await registerEmployeeApplication({
        name: newEmpData.name.trim(),
        team: newEmpData.team,
        position: newEmpData.position,
        phoneNumber: newEmpData.phoneNumber.trim(),
        assignedSite: newEmpData.assignedSite,
        applicationNote: newEmpData.applicationNote.trim(),
      });

      // Auto-approve directly since admin added them
      const creds = await approveUserRegistration(
        result.profile.uid,
        profile?.name || '최고관리자',
        ['대표', '이사', '본부장'].includes(newEmpData.position) ? 'admin' : 'employee'
      );

      setShowAddModal(false);
      setNewEmpData({
        name: '',
        team: '영업1팀',
        position: '과장',
        phoneNumber: '',
        assignedSite: '힐스테이트 센트럴 송도',
        applicationNote: '',
      });
      await loadData();

      setDistributionModal({
        isOpen: true,
        user: result.profile,
        loginId: creds.loginId,
        loginPassword: creds.loginPassword,
      });
      showToast('신규 직원이 등록 및 승인되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('직원 등록 중 오류가 발생했습니다.');
    }
  };

  const copyToClipboard = (text: string, label = '복사되었습니다.') => {
    navigator.clipboard.writeText(text);
    showToast(label);
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = u.name.toLowerCase().includes(kw);
      const matchId = (u.loginId || '').toLowerCase().includes(kw);
      const matchTeam = (u.team || u.department || '').toLowerCase().includes(kw);
      const matchSite = (u.assignedSite || '').toLowerCase().includes(kw);
      const matchPos = (u.position || '').toLowerCase().includes(kw);
      const matchPhone = (u.phoneNumber || '').includes(kw);
      if (!matchName && !matchId && !matchTeam && !matchSite && !matchPos && !matchPhone) {
        return false;
      }
    }
    return true;
  });

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const pendingCount = pendingUsers.length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-950 text-white px-4 py-3 shadow-2xl border border-amber-400 text-xs font-bold animate-in fade-in slide-in-from-top-3">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

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
            가입 신청 직원을 검토하여 승인하고, 자동 생성된 접속 아이디와 비밀번호를 배포합니다.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="h-4 w-4 text-amber-400" />
          <span>신규 직원 직접 등록</span>
        </button>
      </div>

      {/* Pending Applicants Spotlight Card (if any pending) */}
      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
              <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
              <span>신규 직원 등록 신청 승인 대기 ({pendingCount}명)</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              승인 시 발급된 계정 정보(아이디/비밀번호)가 자동 활성화됩니다.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingUsers.map((pUser) => {
              const isExec = ['대표', '이사', '본부장'].includes(pUser.position);
              return (
                <div
                  key={pUser.uid}
                  className="rounded-xl border border-amber-200 bg-white p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm">
                        {pUser.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{pUser.name}</span>
                          <span className="rounded bg-amber-100 text-amber-900 px-1.5 py-0.2 text-[10px] font-bold">
                            {pUser.position}
                          </span>
                          {isExec && (
                            <span className="rounded bg-amber-400 text-slate-950 px-1 text-[9px] font-black">
                              임원
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          소속: <strong className="text-slate-800">{pUser.team || pUser.department}</strong>
                          <span className="mx-1.5 text-slate-300">•</span>
                          {pUser.phoneNumber}
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      신청 대기
                    </span>
                  </div>

                  {pUser.applicationNote && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      <span className="text-slate-400 font-semibold mr-1.5">신청 메모:</span>
                      {pUser.applicationNote}
                    </div>
                  )}

                  {/* Auto-generated Credentials Preview */}
                  <div className="rounded-lg bg-slate-900 text-white p-3 text-xs space-y-1">
                    <div className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      <span>자동 생성 발급 계정 정보</span>
                    </div>
                    <div className="flex items-center justify-between font-mono pt-1">
                      <span>아이디: <strong className="text-amber-300">{pUser.loginId || '미생성'}</strong></span>
                      <span>비밀번호: <strong className="text-emerald-400">{pUser.loginPassword || '미생성'}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(pUser)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-2 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-emerald-400 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>승인 및 계정 배포</span>
                    </button>
                    <button
                      onClick={() => setRejectingUser(pUser)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      반려
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              정상 승인 ({users.filter((u) => u.status === 'active').length})
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
              비활성/차단 ({users.filter((u) => u.status === 'deactivated').length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="이름, 아이디, 팀, 직급, 연락처 검색"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
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
                <th className="px-4 py-3.5">직원 성명</th>
                <th className="px-4 py-3.5">접속 아이디</th>
                <th className="px-4 py-3.5">소속 팀 / 직급</th>
                <th className="px-4 py-3.5">담당 분양 현장</th>
                <th className="px-4 py-3.5">연락처 / 이메일</th>
                <th className="px-4 py-3.5 text-center">계정 상태</th>
                <th className="px-4 py-3.5 text-center">계정 배포 및 관리</th>
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
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-blue-700">
                            {u.loginId || '미설정'}
                          </span>
                          {u.loginId && (
                            <button
                              onClick={() => copyToClipboard(u.loginId!, '아이디가 복사되었습니다.')}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5"
                              title="아이디 복사"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </div>
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
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-500 cursor-pointer"
                              >
                                승인 및 배포
                              </button>
                              <button
                                onClick={() => setRejectingUser(u)}
                                className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                반려
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Open distribution details */}
                              <button
                                onClick={() =>
                                  setDistributionModal({
                                    isOpen: true,
                                    user: u,
                                    loginId: u.loginId || '미생성',
                                    loginPassword: u.loginPassword || '1234',
                                  })
                                }
                                className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                                title="접속 계정 안내문 복사 및 배포"
                              >
                                계정배포
                              </button>

                              {/* Edit ID / Password */}
                              <button
                                onClick={() => {
                                  setUserToEditCreds(u);
                                  setNewLoginId(u.loginId || '');
                                  setNewPassword(u.loginPassword || '');
                                }}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                                title="접속 아이디/비밀번호 변경"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>

                              {/* Edit Team / Position */}
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
                                {u.status === 'active' ? '차단' : '활성'}
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

      {/* Distribution Modal: Copy ID / PW Message */}
      {distributionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-sm">사내망 접속 계정 배포 안내</h3>
              </div>
              <button
                onClick={() => setDistributionModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs space-y-2">
                <div className="font-bold text-emerald-950 text-sm">
                  {distributionModal.user.name} ({distributionModal.user.position}) 계정이 발급되었습니다.
                </div>
                <div className="text-emerald-800 leading-relaxed">
                  아래 접속 정보를 복사하여 해당 직원(문자/카카오톡/사내메신저)에게 전달해 주세요.
                </div>
              </div>

              {/* Credentials Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400">접속 아이디</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {distributionModal.loginId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">임시 비밀번호</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {distributionModal.loginPassword}
                  </span>
                </div>
              </div>

              {/* Ready-to-send Message Template */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  배포용 안내 메시지 전문
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
{`[주식회사 이도 사내망 접속 안내]
안녕하세요, ${distributionModal.user.name}님.
(주)이도 사내 실적관리 인트라넷 계정이 승인 발급되었습니다.

• 접속 아이디: ${distributionModal.loginId}
• 비밀번호: ${distributionModal.loginPassword}

* 로그인 페이지에서 아이디와 비밀번호로 접속하여 주시기 바랍니다.`}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDistributionModal(null)}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `[주식회사 이도 사내망 접속 안내]\n안녕하세요, ${distributionModal.user.name}님.\n(주)이도 사내 실적관리 인트라넷 계정이 승인 발급되었습니다.\n\n• 접속 아이디: ${distributionModal.loginId}\n• 비밀번호: ${distributionModal.loginPassword}\n\n* 로그인 페이지에서 아이디와 비밀번호로 접속하여 주시기 바랍니다.`;
                    copyToClipboard(text, '안내 메시지가 클립보드에 복사되었습니다.');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>안내문 전체 복사</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credentials Modal */}
      {userToEditCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-sm">접속 아이디 및 비밀번호 변경</h3>
              </div>
              <button
                onClick={() => setUserToEditCreds(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredsEdit} className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                <div className="font-bold text-slate-900">{userToEditCreds.name} ({userToEditCreds.position})</div>
                <div className="text-slate-500 mt-0.5">{userToEditCreds.phoneNumber}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">접속 아이디</label>
                <input
                  type="text"
                  required
                  value={newLoginId}
                  onChange={(e) => setNewLoginId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">비밀번호</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToEditCreds(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                >
                  계정 정보 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team / Position Modal */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">직원 소속 팀 및 직급 변경</h3>
              <button onClick={() => setUserToEdit(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                <div className="font-bold text-slate-900">{userToEdit.name}</div>
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
                  placeholder="예: 소속 팀 불일치, 인사명부 미확인 등"
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

      {/* Direct Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-sm">신규 직원 직접 등록 및 승인</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDirectRegister} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  직원 성명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newEmpData.name}
                  onChange={(e) => setNewEmpData({ ...newEmpData, name: e.target.value })}
                  placeholder="예: 홍길동"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">소속 팀</label>
                  <select
                    value={newEmpData.team}
                    onChange={(e) => setNewEmpData({ ...newEmpData, team: e.target.value })}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">직급</label>
                  <select
                    value={newEmpData.position}
                    onChange={(e) =>
                      setNewEmpData({ ...newEmpData, position: e.target.value as AllowedPosition })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none font-bold"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} {['대표', '이사', '본부장'].includes(pos) ? '(임원)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  휴대전화 번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newEmpData.phoneNumber}
                  onChange={(e) => setNewEmpData({ ...newEmpData, phoneNumber: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">담당 분양 현장</label>
                <select
                  value={newEmpData.assignedSite}
                  onChange={(e) => setNewEmpData({ ...newEmpData, assignedSite: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                >
                  {projectSites.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900 leading-relaxed">
                등록 즉시 자동으로 개인 아이디와 임시 비밀번호가 생성되어 활성화되며, 생성 완료 후 계정 배포 창이 열립니다.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400"
                >
                  직원 등록 및 계정 생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
