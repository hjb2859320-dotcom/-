import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  MapPin,
  CheckCircle2,
  Clock,
  Archive,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getProjectSites,
  saveProjectSite,
  deleteProjectSite,
} from '../../services/db';
import type { ProjectSite } from '../../types';

export const AdminProjectManagement: React.FC = () => {
  const { profile } = useAuth();
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / Create Modal
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectSite>>({
    id: '',
    name: '',
    location: '',
    status: 'active',
    description: '',
  });

  // Delete Confirmation Modal
  const [siteToDelete, setSiteToDelete] = useState<ProjectSite | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSites = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getProjectSites();
      setSites(data || []);
      if (isManual) showToast('현장 목록을 새로고침했습니다.');
    } catch (err) {
      console.error(err);
      if (isManual) showToast('현장 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSites();

    const handleUpdate = () => {
      loadSites();
    };

    window.addEventListener('leedo_projects_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('leedo_projects_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      id: `site_${Date.now()}`,
      name: '',
      location: '',
      status: 'active',
      description: '',
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (site: ProjectSite) => {
    setFormData(site);
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      const siteToSave: ProjectSite = {
        id: formData.id || `site_${Date.now()}`,
        name: formData.name.trim(),
        location: formData.location?.trim() || '',
        status: (formData.status as any) || 'active',
        description: formData.description?.trim() || '',
        createdAt: formData.createdAt || new Date().toISOString(),
      };

      await saveProjectSite(siteToSave);
      setIsEditing(false);
      await loadSites();
      showToast(`${siteToSave.name} 분양 현장이 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('현장 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!siteToDelete) return;
    setDeleting(true);
    try {
      await deleteProjectSite(siteToDelete.id);
      if (isEditing && formData.id === siteToDelete.id) {
        setIsEditing(false);
      }
      const deletedName = siteToDelete.name;
      setSiteToDelete(null);
      await loadSites();
      showToast(`${deletedName} 분양 현장이 성공적으로 삭제되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('현장 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <h2 className="text-xl font-bold text-slate-900">분양 사업지(현장) 관리</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
              총 {sites.length}개소
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            이도가 수주하여 대행하는 아파트, 오피스텔, 상가 분양 현장을 등록하고 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadSites(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="현장 목록 새로고침"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin text-amber-500' : ''}`}
            />
            <span>새로고침</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>신규 분양 현장 추가</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sites.length > 0 ? (
          sites.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      s.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : s.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.status === 'active'
                      ? '분양 진행 중'
                      : s.status === 'upcoming'
                      ? '오픈 예정'
                      : '분양 완료'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                      title="현장 정보 수정"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSiteToDelete(s)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="현장 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 font-bold text-base text-slate-900">{s.name}</h3>

                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{s.location || '위치 정보 미등록'}</span>
                </div>

                {s.description && (
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {s.description}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>직원 실적 등록 시 자동 연동 대상</span>
                <button
                  onClick={() => setSiteToDelete(s)}
                  className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer text-[11px]"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            등록된 분양 현장이 없습니다.
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-sm">
                  {sites.some((s) => s.id === formData.id)
                    ? '분양 현장 정보 수정'
                    : '신규 분양 현장 등록'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  현장명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 힐스테이트 센트럴 송도"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">사업지 주소 / 위치</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 인천광역시 연수구 송도동 192-3"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">진행 상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none font-semibold"
                >
                  <option value="active">분양 진행 중</option>
                  <option value="upcoming">오픈 예정</option>
                  <option value="completed">분양 완료(마감)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">현장 규모 및 설명</label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="예: 지하 3층~지상 49층 총 1,280세대 랜드마크 주거타운"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {sites.some((s) => s.id === formData.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = sites.find((s) => s.id === formData.id);
                      if (target) setSiteToDelete(target);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>현장 삭제</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 cursor-pointer"
                  >
                    저장하기
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-5 py-4 text-rose-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-sm">분양 현장 삭제 확인</h3>
              </div>
              <button
                onClick={() => setSiteToDelete(null)}
                className="text-rose-400 hover:text-rose-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">현장명:</span>
                  <span className="font-bold text-slate-900">{siteToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">사업지 위치:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                    {siteToDelete.location || '미등록'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">진행 상태:</span>
                  <span className="font-semibold text-slate-800">
                    {siteToDelete.status === 'active'
                      ? '분양 진행 중'
                      : siteToDelete.status === 'upcoming'
                      ? '오픈 예정'
                      : '분양 완료'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 leading-relaxed">
                해당 분양 현장을 <strong>삭제</strong>하시겠습니까?
                <br />
                삭제 후에는 실적 등록 시 현장 선택 목록에서 제외되며 이 작업은 되돌릴 수 없습니다.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSiteToDelete(null)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{deleting ? '삭제 중...' : '현장 삭제 실행'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
