import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeedoLogo } from '../common/LeedoLogo';

interface HeaderProps {
  onToggleSidebar: () => void;
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  setActiveMenu,
}) => {
  const { profile, logout, isAdmin, canAccessTeamLeaderSystem } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="알림"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">최신 알림</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                  새소식
                </span>
              </div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-800">[자료실] 힐스테이트 센트럴 e카탈로그 등록</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">자료실에서 다운로드 가능합니다.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-800">[공지] 4분기 실적 마감 일정 안내</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">익월 3일 18:00까지 등록 완료 요망</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile button & Dropdown */}
        <div className="relative">
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
