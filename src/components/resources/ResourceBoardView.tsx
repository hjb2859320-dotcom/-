import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  Plus,
  Search,
  Download,
  Trash2,
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle2,
  X,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getResourceItems,
  saveResourceItem,
  deleteResourceItem,
  incrementResourceDownload,
} from '../../services/db';
import type { ResourceItem } from '../../types';

const RESOURCE_CATEGORIES = [
  '전체 자료',
  '분양 브로슈어',
  '계약서 양식',
  '분양공고문',
  '세무/법률 가이드',
  '사업지 분석자료',
  '기타 서식',
];

export const ResourceBoardView: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('전체 자료');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modals
  const [activeItem, setActiveItem] = useState<ResourceItem | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '분양 브로슈어',
    description: '',
    fileName: '',
    fileSize: '3.2 MB',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadResources = async () => {
    setLoading(true);
    try {
      const items = await getResourceItems();
      setResources(items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!formData.title.trim() || !formData.description.trim()) {
      setFormError('제목과 상세 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const newResource: ResourceItem = {
        id: `res_${Date.now()}`,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fileName: formData.fileName.trim() || `${formData.title.trim().replace(/\s+/g, '_')}.pdf`,
        fileSize: formData.fileSize || '2.8 MB',
        authorId: profile.uid,
        authorName: profile.name,
        authorTeam: profile.team || '영업팀',
        authorPosition: profile.position || '직원',
        createdAt: new Date().toISOString(),
        downloadCount: 0,
      };

      await saveResourceItem(newResource);
      setIsRegisterOpen(false);
      setFormData({
        title: '',
        category: '분양 브로슈어',
        description: '',
        fileName: '',
        fileSize: '3.2 MB',
      });
      await loadResources();
      showToast('자료가 성공적으로 등록되었습니다.');
    } catch (err) {
      console.error(err);
      setFormError('자료 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteResourceItem(id);
      if (activeItem?.id === id) setActiveItem(null);
      setItemToDelete(null);
      await loadResources();
      showToast('자료가 삭제되었습니다.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (item: ResourceItem) => {
    await incrementResourceDownload(item.id);
    // Simulate instantaneous safe file download
    const dummyContent = `이도(LEEDO) 사내 업무 자료: ${item.title}\n분류: ${item.category}\n작성자: ${item.authorName} (${item.authorTeam} ${item.authorPosition})\n등록일: ${new Date(item.createdAt).toLocaleDateString('ko-KR')}\n\n[상세 내용]\n${item.description}`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.fileName || `${item.title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    loadResources();
  };

  const filteredResources = resources.filter((r) => {
    if (selectedCategory !== '전체 자료' && r.category !== selectedCategory) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(kw);
      const matchDesc = r.description.toLowerCase().includes(kw);
      const matchAuthor = r.authorName.toLowerCase().includes(kw);
      if (!matchTitle && !matchDesc && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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
            <h2 className="text-xl font-bold text-slate-900">사내 자료실</h2>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              승인 직원 전용 공유 게시판
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            분양 카탈로그, 계약서 양식, 공급공고문 및 고객 상담에 필요한 업무 자료를 자유롭게 열람하고 등록할 수 있습니다.
          </p>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>신규 자료 등록하기</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-amber-400 shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="자료 제목, 내용, 작성자 이름 검색"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredResources.length > 0 ? (
          filteredResources.map((res) => {
            const canManage = isAdmin || profile?.uid === res.authorId;
            return (
              <div
                key={res.id}
                onClick={() => setActiveItem(res)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {res.category}
                    </span>

                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(res.id);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="자료 삭제"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="mt-3 font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {res.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {res.description}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{res.fileName || '문서파일'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2 font-mono">
                      {res.fileSize || '1.5 MB'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800">{res.authorName}</span>
                    <span className="text-slate-400"> ({res.authorTeam} {res.authorPosition})</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(res);
                    }}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>다운로드</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            조회 조건에 해당하는 사내 자료가 없습니다.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <FolderArchive className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-sm">사내 자료 상세 정보</span>
              </div>
              <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                  {activeItem.category}
                </span>
                <h3 className="mt-2 font-bold text-base text-slate-900 leading-snug">
                  {activeItem.title}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span>작성자: {activeItem.authorName} ({activeItem.authorTeam} {activeItem.authorPosition})</span>
                  <span>등록일: {new Date(activeItem.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeItem.description}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <div className="font-bold text-xs text-slate-900">{activeItem.fileName}</div>
                    <div className="text-[11px] text-slate-500">
                      파일 크기: {activeItem.fileSize || '1.8 MB'} | 다운로드: {activeItem.downloadCount || 0}회
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(activeItem)}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>다운로드</span>
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setActiveItem(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Resource Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">신규 사내 자료 등록</h3>
              <button onClick={() => setIsRegisterOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  자료 분류 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                >
                  {RESOURCE_CATEGORIES.filter((c) => c !== '전체 자료').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  자료 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 2026 송도 하반기 분양 카탈로그 및 동호수 배치도"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  상세 설명 및 안내 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="자료에 대한 주요 내용 및 영업 활용 가이드를 작성해 주세요."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    첨부 파일명
                  </label>
                  <input
                    type="text"
                    value={formData.fileName}
                    onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                    placeholder="예: 송도_분양카탈로그_최종.pdf"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    파일 크기
                  </label>
                  <input
                    type="text"
                    value={formData.fileSize}
                    onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
                    placeholder="예: 4.5 MB"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? '등록 저장 중...' : '자료 게시하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
