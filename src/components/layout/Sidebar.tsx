import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  BarChart3,
  Bell,
  CalendarDays,
  Award,
  User,
  ShieldCheck,
  Users,
  Layers,
  Building,
  History,
  X,
  FolderArchive,
  Calendar,
  Network,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LeedoLogo } from '../common/LeedoLogo';

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  setActiveMenu,
  isOpen,
  onClose,
}) => {
  const { profile, isAdmin } = useAuth();

  const isExecutive = ['대표', '이사', '본부장'].includes(profile?.position || '');

  const employeeMenuItems = [
    { id: 'dashboard', label: '메인 대시보드', icon: LayoutDashboard },
    { id: 'register_performance', label: '실적 등록하기', icon: PlusCircle, highlight: true },
    { id: 'my_performance', label: '내 실적 조회', icon: FileSpreadsheet },
    { id: 'performance_stats', label: '실적 통계 분석', icon: BarChart3 },
    { id: 'resources', label: '사내 자료실', icon: FolderArchive, badge: '공유' },
    { id: 'calendar', label: '개인일정표', icon: CalendarDays, badge: '개인' },
    { id: 'organization', label: '사내 조직도', icon: Network },
    { id: 'notices', label: '사내 공지사항', icon: Bell },
    { id: 'events', label: '프로모션 & 이벤트', icon: Calendar },
    { id: 'employee_of_the_month', label: '이달의 우수직원', icon: Award },
    { id: 'profile', label: '내 정보 및 사번', icon: User },
  ];

  const adminMenuItems = [
    { id: 'admin_dashboard', label: '관리자 대시보드', icon: ShieldCheck },
    { id: 'admin_employees', label: '직원 등록 및 승인', icon: Users, badge: '승인관리' },
    { id: 'admin_teams', label: '소속 팀(조직) 관리', icon: Layers, highlight: true },
    { id: 'admin_performances', label: '전체 실적 및 감사로그', icon: History },
    { id: 'admin_notices', label: '공지사항 관리', icon: Bell },
    { id: 'admin_events', label: '이벤트 관리', icon: CalendarDays },
    { id: 'admin_star_employee', label: '이달의 직원 선정', icon: Award },
    { id: 'admin_projects', label: '분양 현장 관리', icon: Building },
  ];

  const handleSelect = (id: string) => {
    setActiveMenu(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-[#0F1E36] text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Uploaded Official Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <LeedoLogo size="md" showText={true} lightText={true} />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Assigned Site & Team Badge */}
        <div className="mx-4 mt-3 rounded-2xl bg-slate-800/70 p-3 border border-slate-700/60 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-medium">소속 팀 / 직급</span>
            <span
              className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                isExecutive
                  ? 'bg-amber-400 text-slate-950 font-black'
                  : 'text-amber-400'
              }`}
            >
              {profile?.position || '직원'}
            </span>
          </div>
          <div className="mt-1 font-bold text-white text-xs truncate flex items-center gap-1.5">
            <span className="text-amber-400">{profile?.team || profile?.department || '영업팀'}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">{profile?.name}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>사번: {profile?.employeeNumber || 'LD-2024-0000'}</span>
            <span className="text-emerald-400 font-semibold">정규 승인</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {/* Employee Menu */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
              직원 업무 포털
            </div>
            <nav className="space-y-1">
              {employeeMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : item.highlight
                        ? 'bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? 'text-white'
                            : item.highlight
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold text-blue-300">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && !isActive && (
                      <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[9px] text-amber-300 font-bold">
                        등록
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin Menu (Shown to admins AND executive positions: 대표, 이사, 본부장) */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  관리자 전용 시스템
                </span>
                <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300">
                  {isExecutive ? '임원전용' : 'ADMIN'}
                </span>
              </div>
              <nav className="space-y-1">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-slate-950' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && !isActive && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800/80 p-3.5 text-[11px] text-slate-400">
          <div className="flex items-center justify-between font-medium">
            <span className="text-[10px]">LEEDO Intranet v2.5</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              전산 정상 가동
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
