import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Pin,
  Calendar,
  User,
  Plus,
  Trash2,
  Edit,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotices, saveNotice, deleteNotice } from '../../services/db';
import type { Notice } from '../../types';

interface NoticeListViewProps {
  initialNotice?: Notice | null;
  onClearInitialNotice?: () => void;
}

export const NoticeListView: React.FC<NoticeListViewProps> = ({
  initialNotice,
  onClearInitialNotice,
}) => {
  const { profile, isAdmin } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Modals
  const [activeNotice, setActiveNotice] = useState<Notice | null>(initialNotice || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Notice>>({
    title: '',
    content: '',
    isImportant: false,
  });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await getNotices();
      setNotices(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (initialNotice) {
      setActiveNotice(initialNotice);
    }
  }, [initialNotice]);

  const filteredNotices = notices
    .filter((n) => {
      if (!searchKeyword.trim()) return true;
      const kw = searchKeyword.toLowerCase();
      return n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw);
    })
    .sort((a, b) => {
      // Important notices first
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleOpenCreateModal = () => {
    setEditFormData({
      id: `notice_${Date.now()}`,
      title: '',
      content: '',
      isImportant: false,
    });
    setIsEditing(true);
  };

  const handleOpenEditModal = (notice: Notice) => {
    setEditFormData(notice);
    setIsEditing(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editFormData.title?.trim() || !editFormData.content?.trim()) return;

    try {
      const noticeToSave: Notice = {
        id: editFormData.id || `notice_${Date.now()}`,
        title: editFormData.title.trim(),
        content: editFormData.content.trim(),
        isImportant: !!editFormData.isImportant,
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: editFormData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveNotice(noticeToSave);
      setIsEditing(false);
      await loadNotices();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await deleteNotice(id);
      if (activeNotice?.id === id) {
        setActiveNotice(null);
      }
      await loadNotices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">사내 공지사항</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            분양 영업 정책, 마감 일정, 분양 현장 주요 안내사항을 전달합니다.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>신규 공지 작성 (관리자)</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="공지사항 제목 또는 내용 검색"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((n) => (
            <div
              key={n.id}
              onClick={() => setActiveNotice(n)}
              className={`rounded-2xl border p-4.5 transition-all cursor-pointer ${
                n.isImportant
                  ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50/80 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {n.isImportant && (
                      <span className="flex shrink-0 items-center gap-1 rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        <Pin className="h-3 w-3" />
                        필독 공지
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm keep-all break-words">{n.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed keep-all">
                    {n.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 shrink-0">
                      <User className="h-3 w-3" />
                      {n.authorName}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="h-3 w-3" />
                      {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenEditModal(n)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="수정"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-sm">사내 공지사항 상세</span>
              </div>
              <button
                onClick={() => {
                  setActiveNotice(null);
                  if (onClearInitialNotice) onClearInitialNotice();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="border-b border-slate-100 pb-3">
                {activeNotice.isImportant && (
                  <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 mb-2">
                    필독 중요 공지
                  </span>
                )}
                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  {activeNotice.title}
                </h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span>작성자: {activeNotice.authorName}</span>
                  <span>등록일: {new Date(activeNotice.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap py-2">
                {activeNotice.content}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => {
                  setActiveNotice(null);
                  if (onClearInitialNotice) onClearInitialNotice();
                }}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Create / Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">공지사항 작성 / 수정</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  공지 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="예: [안내] 4분기 분양 실적 마감 일정 안내"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  상세 내용 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={editFormData.content || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                  placeholder="공지할 내용을 구체적으로 작성해 주세요."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editFormData.isImportant}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, isImportant: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    중요 공지사항으로 상단 고정 (필독 뱃지 부여)
                  </span>
                </label>
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
                  공지사항 저장 및 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
