import React, { createContext, useContext, useEffect, useState } from 'react';
import { signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import { auth, testFirestoreConnection } from '../lib/firebase';
import {
  getUserProfile,
  createUserProfile,
  authenticateUser,
  purgeAllTestAccounts,
  DEFAULT_USERS,
} from '../services/db';
import type { UserProfile } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean; // Includes role === 'admin' OR position is 대표, 이사, 본부장, 관리자
  isTeamLeader: boolean; // 직급이 '팀장'인 사용자
  canAccessTeamLeaderSystem: boolean; // 소속 팀장 및 관리자/임원
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isDeactivated: boolean;
  loginWithCredentials: (
    loginId: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  registerProfile: (
    data: Omit<UserProfile, 'uid' | 'role' | 'status' | 'createdAt'>
  ) => Promise<{ loginId: string; loginPassword: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDemoProfile?: (role: string) => void;
  isDemoMode?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Check auto-login session
    const isAutoLogin = localStorage.getItem('leedo_auto_login') === 'true';
    const saved =
      localStorage.getItem('leedo_current_session') ||
      sessionStorage.getItem('leedo_current_session');
    if (saved && (isAutoLogin || !localStorage.getItem('leedo_logged_out'))) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    testFirestoreConnection();
    purgeAllTestAccounts().catch(() => {});

    // Check if auto-login session exists and refresh latest status from DB
    const initAuth = async () => {
      const isAutoLogin = localStorage.getItem('leedo_auto_login') === 'true';
      const saved =
        localStorage.getItem('leedo_current_session') ||
        sessionStorage.getItem('leedo_current_session');

      if (saved && isAutoLogin) {
        try {
          const parsed = JSON.parse(saved) as UserProfile;
          if (parsed && parsed.uid) {
            const fresh = await getUserProfile(parsed.uid);
            if (fresh && fresh.status === 'active') {
              setProfile(fresh);
              localStorage.setItem('leedo_current_session', JSON.stringify(fresh));
            } else if (fresh) {
              setProfile(fresh);
            } else {
              setProfile(null);
            }
          }
        } catch (err) {
          console.warn('Auto-login session parse error:', err);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginWithCredentials = async (
    loginIdInput: string,
    passwordInput: string,
    rememberMe = false
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await authenticateUser(loginIdInput, passwordInput);
      if (!res.success || !res.user) {
        return { success: false, error: res.error || '로그인에 실패했습니다.' };
      }

      setProfile(res.user);
      localStorage.removeItem('leedo_logged_out');

      if (rememberMe) {
        localStorage.setItem('leedo_auto_login', 'true');
        localStorage.setItem('leedo_current_session', JSON.stringify(res.user));
      } else {
        localStorage.removeItem('leedo_auto_login');
        sessionStorage.setItem('leedo_current_session', JSON.stringify(res.user));
        localStorage.removeItem('leedo_current_session');
      }

      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: '로그인 처리 중 시스템 오류가 발생했습니다.' };
    } finally {
      setLoading(false);
    }
  };

  const registerProfile = async (
    data: Omit<UserProfile, 'uid' | 'role' | 'status' | 'createdAt'>
  ): Promise<{ loginId: string; loginPassword: string }> => {
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const loginId = data.loginId || `leedo_${randNum}`;
    const passDigits = Math.floor(1000 + Math.random() * 9000);
    const loginPassword = data.loginPassword || `ld${passDigits}`;

    const uid = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const isExec = ['대표', '이사', '본부장'].includes(data.position);

    const newProfile: UserProfile = {
      ...data,
      uid,
      loginId,
      loginPassword,
      employeeNumber: data.employeeNumber || `LD-${new Date().getFullYear()}-${randNum}`,
      email: data.email || `${loginId}@leedo.co.kr`,
      role: isExec ? 'admin' : 'employee',
      status: 'pending', // Awaiting admin approval
      createdAt: new Date().toISOString(),
    };

    await createUserProfile(newProfile);
    return { loginId, loginPassword };
  };

  const refreshProfile = async () => {
    if (profile) {
      const p = await getUserProfile(profile.uid);
      if (p) {
        setProfile(p);
        if (localStorage.getItem('leedo_auto_login') === 'true') {
          localStorage.setItem('leedo_current_session', JSON.stringify(p));
        } else {
          sessionStorage.setItem('leedo_current_session', JSON.stringify(p));
        }
      }
    }
  };

  const logout = async () => {
    localStorage.setItem('leedo_logged_out', 'true');
    localStorage.removeItem('leedo_auto_login');
    localStorage.removeItem('leedo_current_session');
    sessionStorage.removeItem('leedo_current_session');
    setProfile(null);
    setFirebaseUser(null);
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Executive & Admin permissions:
  // "대표, 이사, 본부장 직급으로 등록되는사람은 관리자 전용 시스템도 같이 볼 수 있게 해줘"
  const isExecutivePosition = ['대표', '이사', '본부장', '관리자'].includes(profile?.position || '');
  const isAdmin = (profile?.role === 'admin' || isExecutivePosition) && profile?.status === 'active';

  // Team Leader permissions:
  // "팀장 직급인 아이디에는 자기가 소속된 팀원들의 실적을 한눈에 볼 수 있는 메뉴를 추가해줘 그 메뉴는 소속된 팀장,관리자만 보이게 만들어주고 직원들은 볼 수가 없게 해줘"
  const isTeamLeader = (profile?.position === '팀장' || (profile?.position || '').includes('팀장')) && profile?.status === 'active';
  const canAccessTeamLeaderSystem = (isTeamLeader || !!isAdmin) && profile?.status === 'active';

  const isApproved = profile?.status === 'active';
  const isPending = profile?.status === 'pending';
  const isRejected = profile?.status === 'rejected';
  const isDeactivated = profile?.status === 'deactivated';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAdmin: !!isAdmin,
        isTeamLeader: !!isTeamLeader,
        canAccessTeamLeaderSystem: !!canAccessTeamLeaderSystem,
        isApproved: !!isApproved,
        isPending: !!isPending,
        isRejected: !!isRejected,
        isDeactivated: !!isDeactivated,
        loginWithCredentials,
        registerProfile,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
