import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Bell,
  LogOut,
  User as UserIcon,
  Shield,
  Menu,
  ChevronDown,
  Sparkles,
  Building2,
  Calendar,
  Crown,
  FolderArchive,
  Award,
  CheckCheck,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getRecentNotifications,
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/db';
import type {
  AppNotification,
  NotificationCategory,
  Notice,
  InternalEvent,
  ResourceItem,
} from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  onSelectNotice?: (notice: Notice) => void;
  onSelectEvent?: (event: InternalEvent) => void;
  onSelectResource?: (resource: ResourceItem) => void;
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return '방금 전';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return '어제';
    if (diffDay < 7) return `${diffDay}일 전`;
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  } catch {
    return dateStr;
  }
}

function getCategoryConfig(category: NotificationCategory, isImportant?: boolean) {
  switch (category) {
    case 'resource':
      return {
        icon: FolderArchive,
        label: '사내자료실',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        iconBgClass: 'bg-blue-100 text-blue-700',
      };
    case 'notice':
      return {
        icon: Bell,
        label: isImportant ? '중요 공지' : '사내 공지',
        badgeClass: isImportant
          ? 'bg-rose-50 text-rose-700 border-rose-200 font-black'
          : 'bg-slate-100 text-slate-700 border-slate-200',
        iconBgClass: isImportant ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700',
      };
    case 'event':
      return {
        icon: Calendar,
        label: '프로모션&이벤트',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        iconBgClass: 'bg-amber-100 text-amber-800',
      };
    case 'star':
      return {
        icon: Award,
        label: '이달의 우수직원',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        iconBgClass: 'bg-purple-100 text-purple-700',
      };
  }
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  setActiveMenu,
  onSelectNotice,
  onSelectEvent,
  onSelectResource,
}) => {
  const { profile, logout, isAdmin, canAccessTeamLeaderSystem } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Live Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | NotificationCategory>('all');
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const currentDateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(new Date());

  const compactDateStr = new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());

  const isExecutive = ['대표', '이사', '본부장'].includes(profile?.position || '');

  // Load real-time notifications
  const loadNotifications = useCallback(async () => {
    try {
      setNotifLoading(true);
      const list = await getRecentNotifications();
      setNotifications(list);
      if (profile?.uid) {
        setReadNotificationIds(getReadNotificationIds(profile.uid));
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifLoading(false);
    }
  }, [profile?.uid]);

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('leedo_notifications_updated', handleUpdate);
    window.addEventListener('leedo_resources_updated', handleUpdate);
    window.addEventListener('leedo_notices_updated', handleUpdate);
    window.addEventListener('leedo_events_updated', handleUpdate);
    window.addEventListener('leedo_star_updated', handleUpdate);
    window.addEventListener('leedo_notifications_read_updated', () => {
      if (profile?.uid) {
        setReadNotificationIds(getReadNotificationIds(profile.uid));
      }
    });
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('leedo_notifications_updated', handleUpdate);
      window.removeEventListener('leedo_resources_updated', handleUpdate);
      window.removeEventListener('leedo_notices_updated', handleUpdate);
      window.removeEventListener('leedo_events_updated', handleUpdate);
      window.removeEventListener('leedo_star_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadNotifications, profile?.uid]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  // Filtered notifications by category
  const filteredNotifications = useMemo(() => {
    if (notifCategoryFilter === 'all') return notifications;
    return notifications.filter((n) => n.category === notifCategoryFilter);
  }, [notifications, notifCategoryFilter]);

  // Handle clicking a notification
  const handleNotificationClick = (n: AppNotification) => {
    if (profile?.uid) {
      markNotificationAsRead(profile.uid, n.id);
      setReadNotificationIds((prev) => (prev.includes(n.id) ? prev : [...prev, n.id]));
    }
    setShowNotifications(false);

    if (n.category === 'notice' && n.itemData) {
      onSelectNotice?.(n.itemData as Notice);
      setActiveMenu('notices');
    } else if (n.category === 'event' && n.itemData) {
      onSelectEvent?.(n.itemData as InternalEvent);
      setActiveMenu('events');
    } else if (n.category === 'resource' && n.itemData) {
      onSelectResource?.(n.itemData as ResourceItem);
      setActiveMenu('resources');
    } else if (n.category === 'star') {
      setActiveMenu('employee_of_the_month');
    } else {
      setActiveMenu(n.targetMenu);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    if (!profile?.uid) return;
    const allIds = notifications.map((n) => n.id);
    markAllNotificationsAsRead(profile.uid, allIds);
    setReadNotificationIds(allIds);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 sm:px-6 backdrop-blur-md lg:px-8 transition-all">
      {/* Left: Mobile hamburger & Logo & Brand Name */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="메뉴 열기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer active:scale-95 transition-all"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Emblem & Text */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-lg bg-slate-950 p-1 shadow-sm ring-1 ring-amber-400/30 flex items-center justify-center overflow-hidden">
            <img
              src="/leedo_logo.svg"
              alt="LEEDO"
              className="h-full w-full object-contain filter drop-shadow-[0_1px_2px_rgba(217,169,72,0.4)]"
            />
          </div>
          <div className="flex items-baseline gap-1 select-none">
            <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight">이도</span>
            <span className="font-black text-xs sm:text-xs text-amber-500 tracking-wider">LEEDO</span>
            <span className="hidden md:inline text-xs text-slate-400 font-medium ml-1.5">
              | 업무포털
            </span>
          </div>
        </div>

        {/* Date Display: Compact on mobile, Full on desktop */}
        <div className="hidden min-[480px]:flex items-center gap-1.5 rounded-md bg-slate-100/90 px-2 py-1 text-[11px] sm:text-xs font-semibold text-slate-700 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">{currentDateStr}</span>
          <span className="inline sm:hidden">{compactDateStr}</span>
        </div>
      </div>

      {/* Right: User Role Badge, Notifications, User Profile & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Role & Position Badge (hidden on small mobile, visible sm+) */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>{profile?.team || '이도'}</span>
          <span className="text-slate-300">·</span>
          <span className="font-bold text-amber-700">{profile?.position || '직원'}</span>
          {isExecutive && (
            <span className="rounded bg-amber-200 px-1.5 text-[9px] text-amber-900 font-extrabold">
              임원
            </span>
          )}
        </div>

        {/* 최신 알림 (Live Notifications Dropdown) */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              if (!showNotifications) {
                loadNotifications();
              }
            }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors cursor-pointer ${
              showNotifications
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="최신 사내 알림"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs ring-2 ring-white animate-in zoom-in-75">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">최신 사내 알림</span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-extrabold">
                        미확인 {unreadCount}건
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 text-slate-600 px-2 py-0.5 text-[10px] font-semibold">
                        전체 확인 완료
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="모두 읽음으로 표시"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>모두 읽음</span>
                      </button>
                    )}
                    <button
                      onClick={loadNotifications}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                      title="새로고침"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${notifLoading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Category Filter Tabs */}
                <div className="mt-2.5 flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[11px]">
                  <button
                    onClick={() => setNotifCategoryFilter('all')}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifCategoryFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    전체 ({notifications.length})
                  </button>
                  <button
                    onClick={() => setNotifCategoryFilter('resource')}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifCategoryFilter === 'resource'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
                    }`}
                  >
                    자료실
                  </button>
                  <button
                    onClick={() => setNotifCategoryFilter('notice')}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifCategoryFilter === 'notice'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-rose-50 border border-slate-200'
                    }`}
                  >
                    공지사항
                  </button>
                  <button
                    onClick={() => setNotifCategoryFilter('event')}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifCategoryFilter === 'event'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-amber-50 border border-slate-200'
                    }`}
                  >
                    이벤트
                  </button>
                  <button
                    onClick={() => setNotifCategoryFilter('star')}
                    className={`rounded-lg px-2.5 py-1 font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifCategoryFilter === 'star'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-purple-50 border border-slate-200'
                    }`}
                  >
                    우수직원
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => {
                    const isRead = readNotificationIds.includes(n.id);
                    const config = getCategoryConfig(n.category, n.isImportant);
                    const IconComp = config.icon;

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`group relative rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          !isRead
                            ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 shadow-xs'
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Category Icon */}
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${config.iconBgClass}`}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${config.badgeClass}`}
                                >
                                  {config.label}
                                </span>
                                {!isRead && (
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-blue-100"></span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>

                            <h4
                              className={`text-xs mt-1 truncate ${
                                !isRead
                                  ? 'font-bold text-slate-900 group-hover:text-blue-600'
                                  : 'font-semibold text-slate-700'
                              }`}
                            >
                              {n.title}
                            </h4>

                            {n.message && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                            )}

                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                              <span>작성: {n.authorName || '이도'}</span>
                              <span className="flex items-center gap-0.5 text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                                <span>상세보기</span>
                                <ChevronRight className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <Bell className="mx-auto h-7 w-7 text-slate-300 mb-2 stroke-1" />
                    <p className="font-medium text-slate-600">등록된 알림이 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      자료실, 공지사항, 프로모션, 우수직원 등록 시 표시됩니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
                <span className="text-[10px] text-slate-400">
                  사내자료실 · 공지사항 · 프로모션&이벤트 · 이달의 우수직원 실시간 알림 연동
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User profile button & Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-1 sm:px-3 sm:py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="사용자 메뉴"
          >
            <div
              className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-black shadow-xs ${
                isExecutive
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {profile?.name?.charAt(0) || '이'}
            </div>
            <div className="hidden text-left sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{profile?.name}</span>
                <span className="text-[11px] font-semibold text-slate-600">{profile?.position}</span>
                {isExecutive ? (
                  <span className="rounded bg-amber-400 text-slate-950 px-1.5 py-0.2 text-[10px] font-extrabold">
                    임원
                  </span>
                ) : isAdmin ? (
                  <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                    관리자
                  </span>
                ) : (
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-medium text-slate-700">
                    {profile?.team || '영업팀'}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {profile?.name} {profile?.position}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-black ${
                      isExecutive
                        ? 'bg-amber-400 text-slate-950'
                        : isAdmin
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isExecutive ? '임원' : isAdmin ? '관리자' : profile?.position || '직원'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{profile?.email}</div>
                <div className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>{profile?.team || '팀 미배정'}</span>
                  {profile?.assignedSite && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 truncate">{profile.assignedSite}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setActiveMenu('profile');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>내 계정 정보 확인</span>
                </button>

                {canAccessTeamLeaderSystem && (
                  <button
                    onClick={() => {
                      setActiveMenu('team_leader_performances');
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-cyan-800 hover:bg-cyan-50 transition-colors cursor-pointer"
                  >
                    <Crown className="h-4 w-4 text-cyan-600 shrink-0" />
                    <span>팀장 전용 시스템 바로가기</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveMenu('admin_dashboard');
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>관리자 콘솔 바로가기</span>
                  </button>
                )}
              </div>

              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500 shrink-0" />
                <span>시스템 로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
