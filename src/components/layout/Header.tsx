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
  const { profile, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const currentDateStr = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(new Date());

  const isExecutive = ['대표', '이사', '본부장'].includes(profile?.position || '');

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md lg:px-8">
      {/* Left: Mobile hamburger & Logo & Date */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="메뉴 열기"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <LeedoLogo size="sm" showText={false} />
          <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span>{currentDateStr}</span>
          </div>
          <span className="hidden text-xs text-slate-300 sm:inline">|</span>
          <span className="hidden text-xs font-semibold text-slate-600 sm:inline">
            부동산 분양대행 전문기업 (주)이도
          </span>
        </div>
      </div>

      {/* Right: User Role Badge, Notifications, User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role & Position Badge */}
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
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="알림"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">최신 알림</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                  새소식
                </span>
              </div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-800">[자료실] 힐스테이트 센트럴 e카탈로그 등록</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">자료실에서 다운로드 가능합니다.</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-800">[공지] 4분기 실적 마감 일정 안내</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">익월 3일 18:00까지 등록 완료 요망</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User profile capsule */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1.5 sm:px-3 sm:py-1.5 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shadow-xs ${
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
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">
                  {profile?.name} {profile?.position}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{profile?.email}</div>
                <div className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>{profile?.team || '팀 미배정'}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveMenu('profile');
                  setShowUserMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <UserIcon className="h-4 w-4 text-slate-500" />
                <span>내 계정 정보 확인</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveMenu('admin_dashboard');
                    setShowUserMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>관리자 콘솔 바로가기</span>
                </button>
              )}
              <div className="my-1 border-t border-slate-100"></div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
