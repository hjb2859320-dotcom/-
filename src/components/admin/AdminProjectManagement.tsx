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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProjectSites, saveProjectSite } from '../../services/db';
import type { ProjectSite } from '../../types';

export const AdminProjectManagement: React.FC = () => {
  const { profile } = useAuth();
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProjectSite>>({
    id: '',
    name: '',
    location: '',
    status: 'active',
    description: '',
  });

  const loadSites = async () => {
    setLoading(true);
    try {
      const data = await getProjectSites();
      setSites(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
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
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">분양 사업지(현장) 관리</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            이도가 수주하여 대행하는 아파트, 오피스텔, 상가 분양 현장을 등록하고 관리합니다.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>신규 분양 현장 추가</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sites.length > 0 ? (
          sites.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
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

                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
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

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                직원 실적 등록 시 자동 연동 대상
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            등록된 분양 현장이 없습니다.
          </div>
        )}
      </div>

      {/* Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">분양 현장 등록 / 수정</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">사업지 주소 / 위치</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 인천광역시 연수구 송도동 192-3"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">진행 상태</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
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
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
