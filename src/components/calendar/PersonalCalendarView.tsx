import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Circle,
  Trash2,
  Lock,
  Tag,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getPersonalSchedules,
  savePersonalSchedule,
  deletePersonalSchedule,
  togglePersonalSchedule,
} from '../../services/db';
import type { PersonalSchedule } from '../../types';

export const PersonalCalendarView: React.FC = () => {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<PersonalSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Add Schedule Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    time: '14:00',
    category: '고객상담' as PersonalSchedule['category'],
    location: '',
    memo: '',
  });

  const loadSchedules = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const data = await getPersonalSchedules(profile.uid);
      setSchedules(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [profile]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !formData.title.trim()) return;

    try {
      const newSchedule: PersonalSchedule = {
        id: `sched_${Date.now()}`,
        employeeId: profile.uid,
        date: selectedDateStr,
        time: formData.time,
        title: formData.title.trim(),
        category: formData.category,
        location: formData.location.trim(),
        memo: formData.memo.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
      };

      await savePersonalSchedule(newSchedule);
      setIsAddModalOpen(false);
      setFormData({
        title: '',
        time: '14:00',
        category: '고객상담',
        location: '',
        memo: '',
      });
      await loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCompleted = async (id: string, currentStatus: boolean) => {
    try {
      await togglePersonalSchedule(id, !currentStatus);
      await loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePersonalSchedule(id);
      await loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter schedules for selected date
  const daySchedules = schedules.filter((s) => s.date === selectedDateStr);

  const getCategoryColor = (cat: PersonalSchedule['category']) => {
    switch (cat) {
      case '계약체결':
        return 'bg-blue-600 text-white';
      case '고객상담':
        return 'bg-amber-500 text-slate-950';
      case '내방예약':
        return 'bg-emerald-600 text-white';
      case '납부안내':
        return 'bg-purple-600 text-white';
      case '외근/업무':
        return 'bg-slate-700 text-white';
      default:
        return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">개인 업무 일정표</h2>
            <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
              <Lock className="h-3 w-3 text-amber-700" />
              본인 전용 비공개 캘린더
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            고객 상담, 모델하우스 내방 예약, 계약 체결 일정을 개인별로 등록하고 안전하게 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>선택일정 추가</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Calendar View */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          {/* Calendar Month Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-slate-900 text-base">
                {year}년 {month + 1}월
              </h3>
              <span className="text-xs text-slate-400">
                총 {schedules.filter((s) => s.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}건의 일정
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextMonth}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pt-4 text-center text-xs font-bold">
            <span className="text-rose-500 py-1">일</span>
            <span className="text-slate-600 py-1">월</span>
            <span className="text-slate-600 py-1">화</span>
            <span className="text-slate-600 py-1">수</span>
            <span className="text-slate-600 py-1">목</span>
            <span className="text-slate-600 py-1">금</span>
            <span className="text-blue-600 py-1">토</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {/* Empty slots before month start */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-20 sm:h-24 rounded-xl bg-slate-50/40 p-1 opacity-40" />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = selectedDateStr === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;
              const dayItems = schedules.filter((s) => s.date === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`h-20 sm:h-24 rounded-xl border p-1.5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                      : isToday
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'h-5 w-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black'
                          : isSelected
                          ? 'text-blue-700 font-extrabold'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1 rounded-sm">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  {/* Day mini items */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayItems.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className={`truncate rounded px-1 py-0.2 text-[9px] font-semibold ${
                          item.completed
                            ? 'line-through text-slate-400 bg-slate-100'
                            : getCategoryColor(item.category)
                        }`}
                      >
                        {item.title}
                      </div>
                    ))}
                    {dayItems.length > 2 && (
                      <div className="text-[9px] text-slate-400 text-center font-medium">
                        +{dayItems.length - 2}건 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Day Schedule Agenda */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase">선택 일자 일정</span>
                <h3 className="font-bold text-slate-900 text-sm">{selectedDateStr}</h3>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>일정 추가</span>
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {daySchedules.length > 0 ? (
                daySchedules.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 transition-all ${
                      item.completed
                        ? 'border-slate-100 bg-slate-50/60 opacity-60'
                        : 'border-slate-200 bg-white shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleCompleted(item.id, item.completed)}
                          className="mt-0.5 text-slate-400 hover:text-blue-600"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${getCategoryColor(
                                item.category
                              )}`}
                            >
                              {item.category}
                            </span>
                            <span
                              className={`text-xs font-bold ${
                                item.completed ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>

                          {item.time && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>{item.time}</span>
                            </div>
                          )}

                          {item.location && (
                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin className="h-3 w-3 text-slate-400" />
                              <span>{item.location}</span>
                            </div>
                          )}

                          {item.memo && (
                            <div className="mt-1.5 rounded bg-slate-50 p-1.5 text-[10px] text-slate-600 border border-slate-100">
                              {item.memo}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded p-1 text-slate-300 hover:text-rose-500 transition-colors"
                        title="일정 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  <p>등록된 일정이 없습니다.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-2 text-blue-600 font-bold hover:underline"
                  >
                    + 새 일정 등록
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>이 일정표는 오직 본인에게만 표시됩니다.</span>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-sm">개인 일정 등록 ({selectedDateStr})</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  일정 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 힐스테이트 104동 1205호 고객 방문 상담"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">일정 구분</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  >
                    <option value="고객상담">고객상담</option>
                    <option value="내방예약">내방예약</option>
                    <option value="계약체결">계약체결</option>
                    <option value="납부안내">납부안내</option>
                    <option value="외근/업무">외근/업무</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">시간</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">장소</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 송도 모델하우스 2층 상담석"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">메모</label>
                <textarea
                  rows={2}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  placeholder="지참 서류나 유의사항 등"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500"
                >
                  일정 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
