import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { PendingApprovalView } from './components/auth/PendingApprovalView';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';
import { PerformanceRegisterModal } from './components/performance/PerformanceRegisterModal';
import { MyPerformanceList } from './components/performance/MyPerformanceList';
import { PerformanceStats } from './components/performance/PerformanceStats';
import { NoticeListView } from './components/notice/NoticeListView';
import { EventListView } from './components/events/EventListView';
import { EmployeeOfTheMonthView } from './components/employee/EmployeeOfTheMonthView';
import { ResourceBoardView } from './components/resources/ResourceBoardView';
import { PersonalCalendarView } from './components/calendar/PersonalCalendarView';
import { OrganizationChartView } from './components/organization/OrganizationChartView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminEmployeeManagement } from './components/admin/AdminEmployeeManagement';
import { AdminTeamManagement } from './components/admin/AdminTeamManagement';
import { AdminProjectManagement } from './components/admin/AdminProjectManagement';
import { AdminPerformancesView } from './components/admin/AdminPerformancesView';
import { MyProfileView } from './components/profile/MyProfileView';
import { LeedoLogo } from './components/common/LeedoLogo';
import type { Notice, InternalEvent } from './types';

function MainApp() {
  const { profile, loading, isApproved, isPending, isRejected, isDeactivated, isAdmin } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Selected item modals
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<InternalEvent | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center animate-pulse">
            <LeedoLogo size="lg" showText={false} />
          </div>
          <div className="font-bold text-sm text-slate-200">
            (주)이도 사내 실적관리 시스템 로딩 중...
          </div>
          <div className="text-xs text-slate-500">보안 세션 및 권한을 확인하고 있습니다.</div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!profile) {
    if (authView === 'register') {
      return <RegisterView onBackToLogin={() => setAuthView('login')} />;
    }
    return <LoginView onGoToRegister={() => setAuthView('register')} />;
  }

  // Logged in but pending, rejected, or deactivated
  if (isPending || isRejected || isDeactivated) {
    return <PendingApprovalView />;
  }

  // Active Approved User (Employee or Admin)
  return (
    <div className="flex min-h-screen bg-slate-100/80 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-950 text-white px-4 py-3 shadow-2xl border border-amber-400/40 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={(menu) => {
          if (menu === 'register_performance') {
            setIsRegisterModalOpen(true);
          } else {
            setActiveMenu(menu);
          }
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeMenu === 'dashboard' && (
            <EmployeeDashboard
              onOpenRegister={() => setIsRegisterModalOpen(true)}
              onNavigate={(m) => setActiveMenu(m)}
              onSelectNotice={(n) => {
                setSelectedNotice(n);
                setActiveMenu('notices');
              }}
              onSelectEvent={(e) => {
                setSelectedEvent(e);
                setActiveMenu('events');
              }}
            />
          )}

          {activeMenu === 'my_performance' && (
            <MyPerformanceList onOpenRegister={() => setIsRegisterModalOpen(true)} />
          )}

          {activeMenu === 'performance_stats' && (
            <PerformanceStats isAdminView={false} />
          )}

          {activeMenu === 'resources' && (
            <ResourceBoardView />
          )}

          {activeMenu === 'calendar' && (
            <PersonalCalendarView />
          )}

          {activeMenu === 'organization' && (
            <OrganizationChartView />
          )}

          {activeMenu === 'notices' && (
            <NoticeListView
              initialNotice={selectedNotice}
              onClearInitialNotice={() => setSelectedNotice(null)}
            />
          )}

          {activeMenu === 'events' && (
            <EventListView
              initialEvent={selectedEvent}
              onClearInitialEvent={() => setSelectedEvent(null)}
            />
          )}

          {activeMenu === 'employee_of_the_month' && (
            <EmployeeOfTheMonthView />
          )}

          {activeMenu === 'profile' && (
            <MyProfileView />
          )}

          {/* Admin Exclusive Views (Accessible by Admins and Executives: 대표, 이사, 본부장) */}
          {activeMenu === 'admin_dashboard' && (
            <AdminDashboard
              onNavigate={(m) => setActiveMenu(m)}
              onOpenRegister={() => setIsRegisterModalOpen(true)}
            />
          )}

          {activeMenu === 'admin_employees' && (
            <AdminEmployeeManagement />
          )}

          {activeMenu === 'admin_teams' && (
            <AdminTeamManagement />
          )}

          {activeMenu === 'admin_performances' && (
            <AdminPerformancesView onOpenRegister={() => setIsRegisterModalOpen(true)} />
          )}

          {activeMenu === 'admin_notices' && (
            <NoticeListView />
          )}

          {activeMenu === 'admin_events' && (
            <EventListView />
          )}

          {activeMenu === 'admin_star_employee' && (
            <EmployeeOfTheMonthView />
          )}

          {activeMenu === 'admin_projects' && (
            <AdminProjectManagement />
          )}
        </main>
      </div>

      {/* Register Performance Modal */}
      <PerformanceRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          showToast('실적이 데이터베이스에 성공적으로 등록되었습니다.');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
