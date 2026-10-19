import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  FileCheck2,
  Users2,
  Calendar,
  Building,
  RotateCcw,
  FileSpreadsheet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPerformancesByEmployee,
  updatePerformanceRecord,
  getProjectSites,
  exportPerformancesToCsv,
  getPerformanceAuditLogs,
} from '../../services/db';
import type {
  PerformanceRecord,
  PerformanceType,
  ProjectSite,
  PerformanceAuditLog,
} from '../../types';

interface MyPerformanceListProps {
  onOpenRegister: () => void;
}

export const MyPerformanceList: React.FC<MyPerformanceListProps> = ({ onOpenRegister }) => {
  const { profile } = useAuth();
  const [records, setRecords] = useState<PerformanceRecord[]>([]);
  const [projectSites, setProjectSites] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<PerformanceRecord | null>(null);
  const [auditLogsForDetail, setAuditLogsForDetail] = useState<PerformanceAuditLog[]>([]);
  const [recordToCancel, setRecordToCancel] = useState<PerformanceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [empRecords, sites] = await Promise.all([
        getPerformancesByEmployee(profile.uid),
        getProjectSites(),
      ]);
      setRecords(empRecords || []);
      setProjectSites(sites || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  // Filtering
  const filteredRecords = records.filter((r) => {
    if (selectedYear !== 'all') {
      const recYear = r.date.split('-')[0];
      if (recYear !== selectedYear) return false;
    }
    if (selectedMonth !== 'all') {
      const recMonth = r.date.split('-')[1];
      if (recMonth !== selectedMonth) return false;
    }
    if (selectedType !== 'all' && r.type !== selectedType) {
      return false;
    }
    if (selectedSite !== 'all' && r.siteName !== selectedSite) {
      return false;
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      const matchMemo = r.memo?.toLowerCase().includes(kw);
      const matchSite = r.siteName.toLowerCase().includes(kw);
      const matchIdentifier = r.contractIdentifier?.toLowerCase().includes(kw);
      const matchDate = r.date.includes(kw);
      if (!matchMemo && !matchSite && !matchIdentifier && !matchDate) {
        return false;
      }
    }
    return true;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOpenDetail = async (record: PerformanceRecord) => {
    setSelectedRecordForDetail(record);
    try {
      const logs = await getPerformanceAuditLogs(record.id);
      setAuditLogsForDetail(logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleCancelPerformance = async () => {
    if (!recordToCancel || !profile) return;
    if (!cancelReason.trim()) {
      setCancelError('계약 취소 사유를 입력해 주세요.');
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await updatePerformanceRecord(
        recordToCancel.id,
        {
          status: 'cancelled',
          cancelReason: cancelReason.trim(),
          cancelledAt: new Date().toISOString(),
          cancelledBy: profile.name,
        },
        { uid: profile.uid, name: profile.name },
        `[계약 취소] 사유: ${cancelReason.trim()}`
      );
      setRecordToCancel(null);
      setCancelReason('');
      await loadData();
    } catch (err) {
      console.error(err);
      setCancelError('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setCancelling(false);
    }
  };

  const handleExportCsv = () => {
    exportPerformancesToCsv(
      filteredRecords,
      `LEEDO_내실적목록_${profile?.name}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">내 실적 조회</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            본인이 등록한 계약 및 내방객 실적 내역을 상세 조회하고 취소/수정 상태를 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>엑셀 다운로드</span>
          </button>
          <button
            onClick={onOpenRegister}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>실적 등록</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {/* Year */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">연도 선택</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">전체 연도</option>
              <option value="2026">2026년</option>
              <option value="2025">2025년</option>
              <option value="2024">2024년</option>
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">월 선택</label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">전체 월</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                <option key={m} value={m}>
                  {parseInt(m, 10)}월
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">실적 구분</label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">전체 구분</option>
              <option value="contract">계약 실적</option>
              <option value="visitor">내방객 실적</option>
            </select>
          </div>

          {/* Site */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">분양 현장</label>
            <select
              value={selectedSite}
              onChange={(e) => {
                setSelectedSite(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="all">전체 현장</option>
              {projectSites.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">통합 검색</label>
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="동호수, 메모 등 검색"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <div>
            총 <span className="font-bold text-blue-600">{filteredRecords.length}</span>건의 실적이 조회되었습니다.
          </div>
          {(selectedYear !== 'all' || selectedMonth !== 'all' || selectedType !== 'all' || selectedSite !== 'all' || searchKeyword) && (
            <button
              onClick={() => {
                setSelectedYear('all');
                setSelectedMonth('all');
                setSelectedType('all');
                setSelectedSite('all');
                setSearchKeyword('');
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>필터 초기화</span>
            </button>
          )}
        </div>
      </div>

      {/* Performance Records Table (PC) & Cards (Mobile) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600">
              <tr>
                <th className="px-4 py-3.5">발생일자</th>
                <th className="px-4 py-3.5">분양 현장명</th>
                <th className="px-4 py-3.5">실적 구분</th>
                <th className="px-4 py-3.5">세부 내용 (동·호수 / 구분)</th>
                <th className="px-4 py-3.5 text-center">건수 / 인원</th>
                <th className="px-4 py-3.5 text-center">상태</th>
                <th className="px-4 py-3.5">메모</th>
                <th className="px-4 py-3.5 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {r.siteName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          r.type === 'contract'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {r.type === 'contract' ? (
                          <FileCheck2 className="h-3 w-3" />
                        ) : (
                          <Users2 className="h-3 w-3" />
                        )}
                        <span>{r.type === 'contract' ? '계약 실적' : '내방객 실적'}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.type === 'contract' ? (
                        <span className="font-mono font-bold text-blue-700">
                          {r.contractIdentifier || '-'}
                        </span>
                      ) : (
                        <span>
                          {r.visitorType === 'new' ? '신규 내방' : '재방문'}
                          {r.funnelSource ? ` (${r.funnelSource})` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {r.type === 'contract' ? `${r.contractCount || 1}건` : `${r.visitorCount || 0}명`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          r.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status === 'completed' ? '완료' : '계약취소'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                      {r.memo || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenDetail(r)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                          title="상세보기 및 감사이력"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {r.type === 'contract' && r.status === 'completed' && (
                          <button
                            onClick={() => setRecordToCancel(r)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                          >
                            취소처리
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    조회 조건에 해당하는 실적 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {paginatedRecords.length > 0 ? (
            paginatedRecords.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      r.type === 'contract'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {r.type === 'contract' ? '계약' : '내방객'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.status === 'completed' ? '완료' : '취소'}
                  </span>
                </div>

                <div className="font-bold text-slate-900 text-sm">
                  {r.type === 'contract'
                    ? r.contractIdentifier || '동호수 미기재'
                    : `${r.visitorCount}명 내방 (${r.visitorType === 'new' ? '신규' : '재방문'})`}
                </div>

                <div className="text-xs text-slate-500">
                  {r.siteName} | {r.date} 발생
                </div>

                {r.memo && (
                  <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                    {r.memo}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-slate-900 text-xs">
                    {r.type === 'contract' ? `${r.contractCount || 1}건` : `${r.visitorCount || 0}명`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenDetail(r)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 font-medium"
                    >
                      상세
                    </button>
                    {r.type === 'contract' && r.status === 'completed' && (
                      <button
                        onClick={() => setRecordToCancel(r)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
                      >
                        취소요청
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              조회 조건에 해당하는 실적이 없습니다.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 bg-slate-50 text-xs text-slate-600">
            <div>
              {currentPage} / {totalPages} 페이지
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 rounded-lg font-semibold text-xs ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Performance Detail & Audit Log Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">실적 상세 정보 및 이력 관리</h3>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                닫기
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">실적 ID:</span>
                  <span className="font-mono text-slate-700">{selectedRecordForDetail.id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">등록자 / 사번:</span>
                  <span className="font-bold text-slate-900">
                    {selectedRecordForDetail.employeeName} ({selectedRecordForDetail.employeeNumber})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">소속 팀:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedRecordForDetail.team || selectedRecordForDetail.department || '영업팀'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">분양 현장명:</span>
                  <span className="font-bold text-slate-800">{selectedRecordForDetail.siteName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">실적 구분:</span>
                  <span className="font-bold text-blue-600">
                    {selectedRecordForDetail.type === 'contract' ? '계약 실적' : '내방객 실적'}
                  </span>
                </div>
                {selectedRecordForDetail.type === 'contract' ? (
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">동·호수:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedRecordForDetail.contractIdentifier || '-'}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">내방 구분 / 유입:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecordForDetail.visitorType === 'new' ? '신규 내방' : '재방문'}
                      {selectedRecordForDetail.funnelSource ? ` (${selectedRecordForDetail.funnelSource})` : ''}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                  <span className="text-slate-500">진행 상태:</span>
                  <span
                    className={`font-bold ${
                      selectedRecordForDetail.status === 'completed' ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedRecordForDetail.status === 'completed' ? '계약 완료' : '계약 취소'}
                  </span>
                </div>
                {selectedRecordForDetail.cancelReason && (
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-500">취소 사유:</span>
                    <span className="text-rose-700 font-medium">
                      {selectedRecordForDetail.cancelReason}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">등록 일시:</span>
                  <span className="text-slate-600">
                    {new Date(selectedRecordForDetail.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>

              {/* Audit Logs */}
              <div>
                <h4 className="font-bold text-xs text-slate-800 mb-2">실적 수정 및 감사 이력 (Audit Log)</h4>
                {auditLogsForDetail.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogsForDetail.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">
                            {log.performedByName} ({log.action})
                          </span>
                          <span>{new Date(log.timestamp).toLocaleString('ko-KR')}</span>
                        </div>
                        <div className="text-slate-800">{log.details}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-100 p-3 text-center text-xs text-slate-400">
                    최초 등록 이후 변경 이력이 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Cancellation Modal */}
      {recordToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-rose-950 px-6 py-4 text-white">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h3 className="font-bold text-sm">계약 실적 취소 처리</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-900">
                <p className="font-bold">계약 취소 시 원본 기록은 삭제되지 않습니다.</p>
                <p className="mt-1 text-[11px] text-rose-700">
                  사내 규정에 따라 취소 사유와 이력이 데이터베이스에 보존되며, 당월 유효 계약 통계에서 제외됩니다.
                </p>
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                <div>현장: <strong className="text-slate-900">{recordToCancel.siteName}</strong></div>
                <div>동·호수: <strong className="text-slate-900">{recordToCancel.contractIdentifier}</strong></div>
                <div>발생일: <strong className="text-slate-900">{recordToCancel.date}</strong></div>
              </div>

              {cancelError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                  {cancelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  취소 사유 입력 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="예: 고객 단순 변심 해약, 대출 부적격으로 인한 계약 해제 등"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordToCancel(null);
                    setCancelReason('');
                  }}
                  className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  닫기
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelPerformance}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-500 disabled:opacity-50"
                >
                  {cancelling ? '처리 중...' : '계약 취소 확정'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
