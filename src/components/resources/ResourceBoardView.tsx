import React, { useState, useEffect, useRef } from 'react';
import {
  FolderArchive,
  Plus,
  Search,
  Download,
  Trash2,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Paperclip,
  Eye,
  Edit3,
  AlertCircle,
  UploadCloud,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getResourceItems,
  saveResourceItem,
  deleteResourceItem,
  incrementResourceDownload,
} from '../../services/db';
import {
  uploadResourceFile,
  downloadResourceAttachment,
  getResourceFileDataUrl,
  deleteResourceFileBinary,
  validateSelectedFile,
  formatBytes,
  MAX_ATTACHMENTS_PER_POST,
  ALLOWED_EXTENSIONS,
} from '../../services/storage';
import type { ResourceItem, ResourceAttachment } from '../../types';

const RESOURCE_CATEGORIES = [
  '전체 자료',
  '분양 브로슈어',
  '계약서 양식',
  '분양공고문',
  '세무/법률 가이드',
  '사업지 분석자료',
  '기타 서식',
];

interface ResourceBoardViewProps {
  initialResource?: ResourceItem | null;
  onClearInitialResource?: () => void;
}

export const ResourceBoardView: React.FC<ResourceBoardViewProps> = ({
  initialResource,
  onClearInitialResource,
}) => {
  const { profile, isAdmin } = useAuth();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('전체 자료');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Modals
  const [activeItem, setActiveItem] = useState<ResourceItem | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ResourceItem | null>(null);

  // File Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    attachment: ResourceAttachment | null;
    dataUrl: string | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    attachment: null,
    dataUrl: null,
    loading: false,
    error: null,
  });

  // Form State (New or Edit)
  const [formData, setFormData] = useState({
    title: '',
    category: '분양 브로슈어',
    description: '',
  });

  // Staged files for uploading
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ResourceAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  // Upload Progress
  const [uploadProgress, setUploadProgress] = useState<{
    active: boolean;
    fileName: string;
    percent: number;
    chunkCurrent: number;
    chunkTotal: number;
    statusText: string;
  }>({
    active: false,
    fileName: '',
    percent: 0,
    chunkCurrent: 0,
    chunkTotal: 0,
    statusText: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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

  // Open initial resource modal if navigated from notification
  useEffect(() => {
    if (initialResource) {
      setActiveItem(initialResource);
      onClearInitialResource?.();
    }
  }, [initialResource]);

  // Sync activeItem if updated in list
  useEffect(() => {
    if (activeItem) {
      const fresh = resources.find((r) => r.id === activeItem.id);
      if (fresh) setActiveItem(fresh);
    }
  }, [resources]);

  // Open register modal
  const handleOpenRegister = () => {
    setFormData({
      title: '',
      category: '분양 브로슈어',
      description: '',
    });
    setStagedFiles([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
    setFormError(null);
    setIsRegisterOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (item: ResourceItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      description: item.description,
    });
    setExistingAttachments(item.attachments || []);
    setStagedFiles([]);
    setRemovedAttachmentIds([]);
    setFormError(null);
  };

  // File input change handler
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const currentCount = stagedFiles.length + existingAttachments.length;

    if (currentCount + selected.length > MAX_ATTACHMENTS_PER_POST) {
      setFormError(`게시글당 최대 ${MAX_ATTACHMENTS_PER_POST}개의 파일만 첨부할 수 있습니다.`);
      return;
    }

    const validFiles: File[] = [];
    for (const f of selected) {
      const check = validateSelectedFile(f);
      if (!check.valid) {
        setFormError(check.error || '유효하지 않은 파일입니다.');
        return;
      }
      validFiles.push(f);
    }

    setFormError(null);
    setStagedFiles((prev) => [...prev, ...validFiles]);
    // Reset file input value to allow selecting same file again if needed
    e.target.value = '';
  };

  // Remove staged file before upload
  const handleRemoveStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing attachment (in edit mode)
  const handleRemoveExistingAttachment = (attId: string) => {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attId));
    setRemovedAttachmentIds((prev) => [...prev, attId]);
  };

  // Save new resource post
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setFormError('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      setFormError('제목과 상세 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const resourceId = `res_${Date.now()}`;
    const uploadedAttachments: ResourceAttachment[] = [];

    try {
      // 1. Upload staged files
      if (stagedFiles.length > 0) {
        setUploadProgress({
          active: true,
          fileName: stagedFiles[0].name,
          percent: 5,
          chunkCurrent: 1,
          chunkTotal: 1,
          statusText: `파일 준비 중... (총 ${stagedFiles.length}개)`,
        });

        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          setUploadProgress((prev) => ({
            ...prev,
            fileName: file.name,
            statusText: `[${i + 1}/${stagedFiles.length}] ${file.name} 업로드 중...`,
          }));

          const att = await uploadResourceFile(file, resourceId, profile, (p) => {
            setUploadProgress({
              active: true,
              fileName: p.fileName,
              percent: p.percent,
              chunkCurrent: p.chunkCurrent,
              chunkTotal: p.chunkTotal,
              statusText: `[${i + 1}/${stagedFiles.length}] ${p.fileName} (${p.percent}%)`,
            });
          });
          uploadedAttachments.push(att);
        }
      }

      // 2. Save Resource Post metadata
      const primaryFile = uploadedAttachments[0];
      const newResource: ResourceItem = {
        id: resourceId,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fileName: primaryFile ? primaryFile.fileName : '',
        fileSize: primaryFile ? primaryFile.fileSize : '',
        attachments: uploadedAttachments,
        authorId: profile.uid,
        authorName: profile.name,
        authorTeam: profile.team || '영업팀',
        authorPosition: profile.position || '직원',
        createdAt: new Date().toISOString(),
        downloadCount: 0,
      };

      await saveResourceItem(newResource);
      setIsRegisterOpen(false);
      setStagedFiles([]);
      await loadResources();
      showToast('자료와 첨부파일이 영구 저장소에 성공적으로 등록되었습니다.');
    } catch (err: any) {
      console.error('Save resource error:', err);
      setFormError(
        err?.message ||
          '파일 업로드 또는 게시글 저장 중 오류가 발생했습니다. 네트워크 연결을 확인해 주세요.'
      );
    } finally {
      setSubmitting(false);
      setUploadProgress({
        active: false,
        fileName: '',
        percent: 0,
        chunkCurrent: 0,
        chunkTotal: 0,
        statusText: '',
      });
    }
  };

  // Update existing resource post
  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editingItem) return;
    if (!formData.title.trim() || !formData.description.trim()) {
      setFormError('제목과 상세 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const newlyUploaded: ResourceAttachment[] = [];

    try {
      // 1. Upload newly staged files
      if (stagedFiles.length > 0) {
        setUploadProgress({
          active: true,
          fileName: stagedFiles[0].name,
          percent: 5,
          chunkCurrent: 1,
          chunkTotal: 1,
          statusText: `새 파일 업로드 중... (총 ${stagedFiles.length}개)`,
        });

        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          const att = await uploadResourceFile(file, editingItem.id, profile, (p) => {
            setUploadProgress({
              active: true,
              fileName: p.fileName,
              percent: p.percent,
              chunkCurrent: p.chunkCurrent,
              chunkTotal: p.chunkTotal,
              statusText: `[${i + 1}/${stagedFiles.length}] ${p.fileName} (${p.percent}%)`,
            });
          });
          newlyUploaded.push(att);
        }
      }

      // 2. Clean up removed attachment binaries
      if (removedAttachmentIds.length > 0) {
        for (const remId of removedAttachmentIds) {
          await deleteResourceFileBinary(remId, 10);
        }
      }

      // 3. Combine kept existing and newly uploaded attachments
      const allAttachments = [...existingAttachments, ...newlyUploaded];
      const primaryFile = allAttachments[0];

      const updatedResource: ResourceItem = {
        ...editingItem,
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        fileName: primaryFile ? primaryFile.fileName : '',
        fileSize: primaryFile ? primaryFile.fileSize : '',
        attachments: allAttachments,
        updatedAt: new Date().toISOString(),
      };

      await saveResourceItem(updatedResource);
      setEditingItem(null);
      setStagedFiles([]);
      await loadResources();
      showToast('자료가 성공적으로 수정되었습니다.');
    } catch (err: any) {
      console.error('Update resource error:', err);
      setFormError(err?.message || '자료 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
      setUploadProgress({
        active: false,
        fileName: '',
        percent: 0,
        chunkCurrent: 0,
        chunkTotal: 0,
        statusText: '',
      });
    }
  };

  // Delete post
  const handleDelete = async (id: string) => {
    if (!window.confirm('정말로 이 자료와 첨부파일을 삭제하시겠습니까?')) return;
    try {
      await deleteResourceItem(id);
      if (activeItem?.id === id) setActiveItem(null);
      await loadResources();
      showToast('자료가 영구 삭제되었습니다.');
    } catch (err) {
      console.error(err);
      showToast('자료 삭제 중 오류가 발생했습니다.');
    }
  };

  // Download real attachment
  const handleDownloadAttachment = async (
    item: ResourceItem,
    attachment: ResourceAttachment
  ) => {
    if (!profile) {
      showToast('로그인한 승인 직원만 첨부파일을 다운로드할 수 있습니다.');
      return;
    }

    setDownloadingFileId(attachment.id);
    try {
      await incrementResourceDownload(item.id);
      await downloadResourceAttachment(attachment);
      showToast(`'${attachment.fileName}' 파일 다운로드를 완료했습니다.`);
      loadResources();
    } catch (err: any) {
      console.error('Download error:', err);
      alert(`다운로드 실패: ${err?.message || '파일을 불러올 수 없습니다.'}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Fallback download for legacy item without attachments
  const handleDownloadLegacy = async (item: ResourceItem) => {
    await incrementResourceDownload(item.id);
    const dummyContent = `이도(LEEDO) 사내 업무 자료: ${item.title}\n분류: ${item.category}\n작성자: ${item.authorName} (${item.authorTeam} ${item.authorPosition})\n등록일: ${new Date(item.createdAt).toLocaleDateString('ko-KR')}\n\n[상세 내용]\n${item.description}`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.fileName || `${item.title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    loadResources();
  };

  // In-browser preview for PDF and Images
  const handlePreviewAttachment = async (attachment: ResourceAttachment) => {
    setPreviewModal({
      isOpen: true,
      attachment,
      dataUrl: null,
      loading: true,
      error: null,
    });

    try {
      const dataUrl = await getResourceFileDataUrl(attachment);
      setPreviewModal({
        isOpen: true,
        attachment,
        dataUrl,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Preview load error:', err);
      setPreviewModal({
        isOpen: true,
        attachment,
        dataUrl: null,
        loading: false,
        error: err?.message || '미리보기 데이터를 불러오지 못했습니다.',
      });
    }
  };

  // Filter resources
  const filteredResources = resources.filter((r) => {
    if (selectedCategory !== '전체 자료' && r.category !== selectedCategory) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(kw);
      const matchDesc = r.description.toLowerCase().includes(kw);
      const matchAuthor = r.authorName.toLowerCase().includes(kw);
      const matchFiles =
        r.attachments?.some((a) => a.fileName.toLowerCase().includes(kw)) ||
        (r.fileName && r.fileName.toLowerCase().includes(kw));
      if (!matchTitle && !matchDesc && !matchAuthor && !matchFiles) return false;
    }
    return true;
  });

  // Helper for badge style and preview capability
  const getFileBadgeInfo = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
      return {
        label: 'PDF',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        iconColor: 'text-rose-500',
        canPreview: true,
      };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return {
        label: 'EXCEL',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconColor: 'text-emerald-600',
        canPreview: false,
      };
    }
    if (['doc', 'docx'].includes(ext)) {
      return {
        label: 'WORD',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconColor: 'text-blue-600',
        canPreview: false,
      };
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return {
        label: 'PPT',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        iconColor: 'text-amber-600',
        canPreview: false,
      };
    }
    if (['hwp', 'hwpx'].includes(ext)) {
      return {
        label: '한글',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        iconColor: 'text-indigo-600',
        canPreview: false,
      };
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return {
        label: '이미지',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
        iconColor: 'text-violet-600',
        canPreview: true,
      };
    }
    if (['zip', 'rar', '7z'].includes(ext)) {
      return {
        label: 'ZIP',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        iconColor: 'text-slate-600',
        canPreview: false,
      };
    }
    return {
      label: ext.toUpperCase() || '문서',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
      iconColor: 'text-slate-500',
      canPreview: false,
    };
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-amber-400 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">사내 자료실</h2>
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              실제 파일 영구 스토리지 연동
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            분양 카탈로그, 표준 계약서 양식, 공급공고문, HWP, 엑셀, PDF 등 실무 파일을 안전하게 업로드하고 전 직원이 공유할 수 있습니다.
          </p>
        </div>

        <button
          onClick={handleOpenRegister}
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
            placeholder="자료 제목, 내용, 첨부파일명, 작성자 검색"
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
            const attachmentsCount = res.attachments?.length || (res.fileName ? 1 : 0);
            const firstAttachment = res.attachments?.[0];
            const badgeInfo = getFileBadgeInfo(firstAttachment?.fileName || res.fileName || '');

            return (
              <div
                key={res.id}
                onClick={() => setActiveItem(res)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {res.category}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(res);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="자료 수정"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(res.id);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="자료 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="mt-3 font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {res.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {res.description}
                  </p>

                  {/* Attachment Box */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-2.5 border border-slate-100 flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeInfo.badgeClass}`}
                      >
                        {badgeInfo.label}
                      </span>
                      <span className="truncate font-medium text-[11px]">
                        {firstAttachment?.fileName || res.fileName || '첨부 파일'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {attachmentsCount > 1 && (
                        <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.2">
                          +{attachmentsCount - 1}개
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {firstAttachment?.fileSize || res.fileSize || ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-800">{res.authorName}</span>
                    <span className="text-slate-400">
                      {' '}
                      ({res.authorTeam} {res.authorPosition})
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (firstAttachment) {
                        handleDownloadAttachment(res, firstAttachment);
                      } else {
                        handleDownloadLegacy(res);
                      }
                    }}
                    disabled={downloadingFileId === (firstAttachment?.id || 'legacy')}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {downloadingFileId === (firstAttachment?.id || 'legacy') ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>다운로드</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-3 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            {loading ? '자료 목록을 불러오는 중입니다...' : '조회 조건에 해당하는 사내 자료가 없습니다.'}
          </div>
        )}
      </div>

      {/* Detail Modal with Full Attachments List */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <FolderArchive className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-sm">사내 자료 상세 정보</span>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                    {activeItem.category}
                  </span>
                  {(isAdmin || profile?.uid === activeItem.authorId) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const item = activeItem;
                          setActiveItem(null);
                          handleOpenEdit(item);
                        }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(activeItem.id)}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="mt-2 font-bold text-base text-slate-900 leading-snug">
                  {activeItem.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>
                    작성자: {activeItem.authorName} ({activeItem.authorTeam}{' '}
                    {activeItem.authorPosition})
                  </span>
                  <span>등록일: {new Date(activeItem.createdAt).toLocaleDateString('ko-KR')}</span>
                  {activeItem.updatedAt && (
                    <span className="text-amber-600 font-medium">
                      (수정됨: {new Date(activeItem.updatedAt).toLocaleDateString('ko-KR')})
                    </span>
                  )}
                  <span>다운로드: {activeItem.downloadCount || 0}회</span>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeItem.description}
              </div>

              {/* Attached Files Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <span>
                      첨부파일 목록 (
                      {activeItem.attachments?.length || (activeItem.fileName ? 1 : 0)}개)
                    </span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-400">
                    클릭하여 안전하게 다운로드 또는 미리보기
                  </span>
                </div>

                {activeItem.attachments && activeItem.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {activeItem.attachments.map((att) => {
                      const badge = getFileBadgeInfo(att.fileName);
                      const isDownloading = downloadingFileId === att.id;

                      return (
                        <div
                          key={att.id}
                          className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {att.fileName}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                크기: {att.fileSize}
                                {att.uploadedAt && (
                                  <span>
                                    {' '}
                                    • {new Date(att.uploadedAt).toLocaleDateString('ko-KR')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {badge.canPreview && (
                              <button
                                onClick={() => handlePreviewAttachment(att)}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                title="브라우저에서 미리보기"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-500" />
                                <span>미리보기</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDownloadAttachment(activeItem, att)}
                              disabled={isDownloading}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isDownloading ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              <span>다운로드</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Legacy attachment display */
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="h-6 w-6 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {activeItem.fileName || '문서 파일'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          파일 크기: {activeItem.fileSize || '1.8 MB'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadLegacy(activeItem)}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-xs cursor-pointer shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      <span>다운로드</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setActiveItem(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewModal.isOpen && previewModal.attachment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2 truncate">
                <Eye className="h-5 w-5 text-amber-400 shrink-0" />
                <span className="font-bold text-sm truncate">
                  파일 미리보기: {previewModal.attachment.fileName}
                </span>
                <span className="text-xs text-slate-400">({previewModal.attachment.fileSize})</span>
              </div>
              <button
                onClick={() =>
                  setPreviewModal({
                    isOpen: false,
                    attachment: null,
                    dataUrl: null,
                    loading: false,
                    error: null,
                  })
                }
                className="text-slate-400 hover:text-white cursor-pointer ml-3"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex items-center justify-center min-h-[400px] bg-slate-100">
              {previewModal.loading ? (
                <div className="text-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">
                    서버 영구 저장소에서 파일 데이터를 읽어오는 중입니다...
                  </p>
                </div>
              ) : previewModal.error ? (
                <div className="text-center space-y-2 text-rose-600 p-6">
                  <AlertCircle className="h-8 w-8 mx-auto" />
                  <p className="text-xs font-bold">{previewModal.error}</p>
                </div>
              ) : previewModal.dataUrl ? (
                previewModal.attachment.fileType === 'pdf' ? (
                  <iframe
                    src={previewModal.dataUrl}
                    title={previewModal.attachment.fileName}
                    className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white"
                  />
                ) : (
                  <img
                    src={previewModal.dataUrl}
                    alt={previewModal.attachment.fileName}
                    className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-md"
                  />
                )
              ) : null}
            </div>

            <div className="border-t border-slate-200 bg-white p-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                다운로드하여 원본 프로그램으로 열람할 수도 있습니다.
              </div>
              <div className="flex items-center gap-2">
                {previewModal.dataUrl && (
                  <button
                    onClick={() => {
                      if (activeItem && previewModal.attachment) {
                        handleDownloadAttachment(activeItem, previewModal.attachment);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>다운로드</span>
                  </button>
                )}
                <button
                  onClick={() =>
                    setPreviewModal({
                      isOpen: false,
                      attachment: null,
                      dataUrl: null,
                      loading: false,
                      error: null,
                    })
                  }
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Resource Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">신규 사내 자료 등록</h3>
              </div>
              <button
                onClick={() => !submitting && setIsRegisterOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{formError}</span>
                </div>
              )}

              {/* Progress bar */}
              {uploadProgress.active && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-blue-900">
                    <span>{uploadProgress.statusText}</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  자료 분류 <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={submitting}
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
                  disabled={submitting}
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
                  rows={3}
                  required
                  disabled={submitting}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="자료에 대한 주요 내용 및 고객 상담/영업 활용 가이드를 작성해 주세요."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Real File Attachment Section */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    실제 파일 첨부{' '}
                    <span className="text-slate-400 font-normal">
                      (최대 {MAX_ATTACHMENTS_PER_POST}개, 파일당 15MB)
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {stagedFiles.length} / {MAX_ATTACHMENTS_PER_POST}개 선택됨
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  disabled={submitting || stagedFiles.length >= MAX_ATTACHMENTS_PER_POST}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.zip"
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                {/* Upload Trigger Area */}
                <div
                  onClick={() => {
                    if (!submitting && stagedFiles.length < MAX_ATTACHMENTS_PER_POST) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
                    stagedFiles.length >= MAX_ATTACHMENTS_PER_POST
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-400'
                  }`}
                >
                  <Paperclip className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-xs font-bold text-slate-800">
                    PC 또는 휴대폰에서 파일 선택하기
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PDF, 엑셀(XLS/XLSX), 한글(HWP/HWPX), 워드(DOC/DOCX), PPT, 이미지(JPG/PNG), 압축파일(ZIP)
                  </p>
                </div>

                {/* Selected Files Badges */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {stagedFiles.map((file, idx) => {
                      const badge = getFileBadgeInfo(file.name);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            <span className="truncate font-semibold text-slate-800">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                              ({formatBytes(file.size)})
                            </span>
                          </div>

                          {!submitting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(idx)}
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                              title="선택 취소"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsRegisterOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>파일 업로드 및 저장 중...</span>
                    </>
                  ) : (
                    <span>자료 등록 완료</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">사내 자료 수정</h3>
              </div>
              <button
                onClick={() => !submitting && setEditingItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{formError}</span>
                </div>
              )}

              {uploadProgress.active && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-blue-900">
                    <span>{uploadProgress.statusText}</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  자료 분류 <span className="text-rose-500">*</span>
                </label>
                <select
                  disabled={submitting}
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
                  disabled={submitting}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  상세 설명 및 안내 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={submitting}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              {/* Attachments Management */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    첨부파일 관리{' '}
                    <span className="text-slate-400 font-normal">
                      (기존 파일 유지 및 추가/삭제 가능)
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    총 {existingAttachments.length + stagedFiles.length} /{' '}
                    {MAX_ATTACHMENTS_PER_POST}개
                  </span>
                </div>

                {/* Existing attachments list */}
                {existingAttachments.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">기존 첨부파일</span>
                    {existingAttachments.map((att) => {
                      const badge = getFileBadgeInfo(att.fileName);
                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            <span className="truncate font-semibold text-slate-800">
                              {att.fileName}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                              ({att.fileSize})
                            </span>
                          </div>

                          {!submitting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingAttachment(att.id)}
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                              title="첨부파일 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  disabled={
                    submitting ||
                    existingAttachments.length + stagedFiles.length >= MAX_ATTACHMENTS_PER_POST
                  }
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.jpg,.jpeg,.png,.zip"
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                {/* Add more files trigger */}
                {existingAttachments.length + stagedFiles.length < MAX_ATTACHMENTS_PER_POST && (
                  <div
                    onClick={() => {
                      if (!submitting) editFileInputRef.current?.click();
                    }}
                    className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-3 text-center cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700">
                      <Plus className="h-4 w-4" />
                      <span>추가 첨부파일 선택</span>
                    </div>
                  </div>
                )}

                {/* Newly staged files */}
                {stagedFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    <span className="text-[11px] font-bold text-blue-700">새로 추가할 파일</span>
                    {stagedFiles.map((file, idx) => {
                      const badge = getFileBadgeInfo(file.name);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/50 p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            <span className="truncate font-semibold text-slate-800">
                              {file.name}
                            </span>
                            <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                              ({formatBytes(file.size)})
                            </span>
                          </div>

                          {!submitting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedFile(idx)}
                              className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-2"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setEditingItem(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>수정 저장 중...</span>
                    </>
                  ) : (
                    <span>수정 완료</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
