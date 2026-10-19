import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getEvents, saveEvent, deleteEvent } from '../../services/db';
import type { InternalEvent } from '../../types';

interface EventListViewProps {
  initialEvent?: InternalEvent | null;
  onClearInitialEvent?: () => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  initialEvent,
  onClearInitialEvent,
}) => {
  const { profile, isAdmin } = useAuth();
  const [events, setEvents] = useState<InternalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeEvent, setActiveEvent] = useState<InternalEvent | null>(initialEvent || null);
  const [isEditing, setIsEditing] = useState(false);
  const [joinedEventIds, setJoinedEventIds] = useState<string[]>([]);
  const [editFormData, setEditFormData] = useState<Partial<InternalEvent>>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'ongoing',
    howToParticipate: '',
  });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      setEvents(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (initialEvent) {
      setActiveEvent(initialEvent);
    }
  }, [initialEvent]);

  const handleOpenCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
    setEditFormData({
      id: `event_${Date.now()}`,
      title: '',
      description: '',
      startDate: today,
      endDate: nextMonth,
      status: 'ongoing',
      howToParticipate: '',
    });
    setIsEditing(true);
  };

  const handleOpenEditModal = (event: InternalEvent) => {
    setEditFormData(event);
    setIsEditing(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editFormData.title?.trim()) return;

    try {
      const eventToSave: InternalEvent = {
        id: editFormData.id || `event_${Date.now()}`,
        title: editFormData.title.trim(),
        description: editFormData.description?.trim() || '',
        startDate: editFormData.startDate || new Date().toISOString().split('T')[0],
        endDate: editFormData.endDate || new Date().toISOString().split('T')[0],
        status: (editFormData.status as any) || 'ongoing',
        howToParticipate: editFormData.howToParticipate?.trim() || '',
        authorId: profile.uid,
        authorName: profile.name,
        createdAt: editFormData.createdAt || new Date().toISOString(),
      };

      await saveEvent(eventToSave);
      setIsEditing(false);
      await loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
      if (activeEvent?.id === id) {
        setActiveEvent(null);
      }
      await loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleJoin = (eventId: string) => {
    if (joinedEventIds.includes(eventId)) {
      setJoinedEventIds(joinedEventIds.filter((id) => id !== eventId));
    } else {
      setJoinedEventIds([...joinedEventIds, eventId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">프로모션 & 사내 이벤트</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            분양 영업 목표 달성 인센티브 프로모션 및 사내 시상 이벤트에 참여하세요.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>신규 이벤트 등록 (관리자)</span>
          </button>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {events.length > 0 ? (
          events.map((ev) => {
            const isJoined = joinedEventIds.includes(ev.id);
            return (
              <div
                key={ev.id}
                onClick={() => setActiveEvent(ev)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        ev.status === 'ongoing'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ev.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ev.status === 'ongoing'
                        ? '진행 중'
                        : ev.status === 'upcoming'
                        ? '시작 예정'
                        : '종료됨'}
                    </span>

                    {isAdmin && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="mt-3 font-bold text-slate-900 text-base">{ev.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                    <div className="font-bold text-[11px] text-slate-500 mb-0.5">참여 방법:</div>
                    <div>{ev.howToParticipate || '실적 등록 시 자동 참여 집계'}</div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">
                    {ev.startDate} ~ {ev.endDate}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleJoin(ev.id);
                    }}
                    className={`rounded-xl px-3 py-1.5 font-bold transition-all ${
                      isJoined
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isJoined ? '참여 등록 완료 ✓' : '참여 신청하기'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
            진행 중인 이벤트가 없습니다.
          </div>
        )}
      </div>

      {/* Event Detail Modal */}
      {activeEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-sm">프로모션 상세 안내</span>
              </div>
              <button
                onClick={() => {
                  setActiveEvent(null);
                  if (onClearInitialEvent) onClearInitialEvent();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {activeEvent.status === 'ongoing' ? '진행 중' : '종료'}
                </span>
                <h3 className="mt-2 font-bold text-lg text-slate-900 leading-snug">
                  {activeEvent.title}
                </h3>
                <div className="mt-1 text-xs text-slate-400">
                  진행 기간: {activeEvent.startDate} ~ {activeEvent.endDate}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {activeEvent.description}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
                <div className="font-bold mb-1">참여 및 시상 규정:</div>
                <p className="leading-relaxed">{activeEvent.howToParticipate}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 flex justify-end">
              <button
                onClick={() => {
                  setActiveEvent(null);
                  if (onClearInitialEvent) onClearInitialEvent();
                }}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">프로모션 이벤트 등록 / 수정</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  이벤트 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="예: 2026 하반기 분양 챔피언 포상 프로모션"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">시작일</label>
                  <input
                    type="date"
                    required
                    value={editFormData.startDate || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, startDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">종료일</label>
                  <input
                    type="date"
                    required
                    value={editFormData.endDate || ''}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, endDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">상세 내용</label>
                <textarea
                  rows={4}
                  required
                  value={editFormData.description || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, description: e.target.value })
                  }
                  placeholder="인센티브 포상 내용 및 달성 조건 설명"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">참여 방법</label>
                <input
                  type="text"
                  value={editFormData.howToParticipate || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, howToParticipate: e.target.value })
                  }
                  placeholder="예: 당월 계약 10건 이상 등록 시 자동 신청"
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none"
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
                  이벤트 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
