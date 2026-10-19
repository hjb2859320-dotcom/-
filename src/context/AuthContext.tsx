import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, testFirestoreConnection } from '../lib/firebase';
import {
  getUserProfile,
  createUserProfile,
  ADMIN_EMAIL,
  seedInitialDataIfEmpty,
} from '../services/db';
import type { UserProfile, AllowedPosition } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean; // Includes role === 'admin' OR position is 대표, 이사, 본부장
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isDeactivated: boolean;
  signInWithGoogle: () => Promise<void>;
  registerProfile: (data: Omit<UserProfile, 'uid' | 'email' | 'role' | 'status' | 'createdAt'>) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setDemoProfile: (role: 'admin' | 'employee' | 'pending' | 'executive') => void;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo profiles for immediate testing
const DEMO_ADMIN: UserProfile = {
  uid: 'demo-admin-01',
  name: '김도현',
  employeeNumber: 'LD-2021-0001',
  team: '경영관리팀',
  assignedSite: '힐스테이트 센트럴 송도',
  position: '관리자', // Updated from 총괄본부장 to 관리자
  phoneNumber: '010-8291-5501',
  email: 'admin.kim@leedo.co.kr',
  role: 'admin',
  status: 'active',
  createdAt: '2021-03-01T09:00:00.000Z',
  approvedAt: '2021-03-01T09:00:00.000Z',
};

const DEMO_EXECUTIVE: UserProfile = {
  uid: 'demo-exec-01',
  name: '이도원',
  employeeNumber: 'LD-2018-0001',
  team: '경영기획팀',
  assignedSite: '송도 랜드마크시티',
  position: '대표', // Executive position granting full admin system access
  phoneNumber: '010-9999-1004',
  email: 'ceo.lee@leedo.co.kr',
  role: 'employee',
  status: 'active',
  createdAt: '2018-01-01T09:00:00.000Z',
  approvedAt: '2018-01-01T09:00:00.000Z',
  approvedBy: '이사회',
};

const DEMO_EMPLOYEE: UserProfile = {
  uid: 'demo-emp-01',
  name: '박서준',
  employeeNumber: 'LD-2024-0015',
  team: '영업1팀',
  assignedSite: '힐스테이트 센트럴 송도',
  position: '과장',
  phoneNumber: '010-3342-9981',
  email: 'seojun.park@leedo.co.kr',
  role: 'employee',
  status: 'active',
  createdAt: '2024-01-10T10:00:00.000Z',
  approvedAt: '2024-01-11T14:30:00.000Z',
  approvedBy: '관리자',
};

const DEMO_PENDING: UserProfile = {
  uid: 'demo-pending-01',
  name: '이지은',
  employeeNumber: 'LD-2026-0042',
  team: '영업2팀',
  assignedSite: '동탄 레이크 타워',
  position: '대리',
  phoneNumber: '010-5512-4478',
  email: 'jieun.lee@leedo.co.kr',
  role: 'employee',
  status: 'pending',
  createdAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Check if session has a demo profile stored
    const saved = localStorage.getItem('leedo_current_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return !!localStorage.getItem('leedo_is_demo_mode');
  });

  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isDemoMode && profile) {
        setLoading(false);
        return;
      }

      setFirebaseUser(user);
      if (user) {
        try {
          let userProf = await getUserProfile(user.uid);
          const isBootAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

          if (!userProf) {
            if (isBootAdmin) {
              const newAdmin: UserProfile = {
                uid: user.uid,
                name: user.displayName || '이도 관리자',
                employeeNumber: 'LD-ADMIN-01',
                team: '경영관리팀',
                assignedSite: '힐스테이트 센트럴 송도',
                position: '관리자', // Updated to 관리자
                phoneNumber: '010-0000-0000',
                email: user.email || ADMIN_EMAIL,
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                approvedAt: new Date().toISOString(),
              };
              await createUserProfile(newAdmin);
              userProf = newAdmin;
              await seedInitialDataIfEmpty(user.uid, newAdmin.name);
            }
          }
          setProfile(userProf);
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const signInWithGoogle = async () => {
    setLoading(true);
    setIsDemoMode(false);
    localStorage.removeItem('leedo_is_demo_mode');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      let userProf = await getUserProfile(user.uid);
      const isBootAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (!userProf && isBootAdmin) {
        const newAdmin: UserProfile = {
          uid: user.uid,
          name: user.displayName || '이도 관리자',
          employeeNumber: 'LD-ADMIN-01',
          team: '경영관리팀',
          assignedSite: '힐스테이트 센트럴 송도',
          position: '관리자',
          phoneNumber: '010-0000-0000',
          email: user.email || ADMIN_EMAIL,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
        };
        await createUserProfile(newAdmin);
        userProf = newAdmin;
        await seedInitialDataIfEmpty(user.uid, newAdmin.name);
      }
      setProfile(userProf);
      localStorage.setItem('leedo_current_session', JSON.stringify(userProf));
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerProfile = async (
    data: Omit<UserProfile, 'uid' | 'email' | 'role' | 'status' | 'createdAt'>
  ) => {
    const uid = firebaseUser?.uid || `user-${Date.now()}`;
    const email = firebaseUser?.email || `${data.employeeNumber.toLowerCase()}@leedo.co.kr`;

    // Representative/Directors check
    const isExecutive = ['대표', '이사', '본부장'].includes(data.position);

    const newProfile: UserProfile = {
      ...data,
      uid,
      email,
      role: isExecutive ? 'admin' : 'employee',
      status: 'pending', // Awaiting admin approval
      createdAt: new Date().toISOString(),
    };

    await createUserProfile(newProfile);
    setProfile(newProfile);
    localStorage.setItem('leedo_current_session', JSON.stringify(newProfile));
  };

  const refreshProfile = async () => {
    if (profile) {
      const p = await getUserProfile(profile.uid);
      if (p) {
        setProfile(p);
        localStorage.setItem('leedo_current_session', JSON.stringify(p));
      }
    }
  };

  const logout = async () => {
    setIsDemoMode(false);
    localStorage.removeItem('leedo_is_demo_mode');
    localStorage.removeItem('leedo_current_session');
    setProfile(null);
    setFirebaseUser(null);
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const setDemoProfile = (role: 'admin' | 'employee' | 'pending' | 'executive') => {
    setIsDemoMode(true);
    localStorage.setItem('leedo_is_demo_mode', 'true');
    setLoading(false);
    let chosen: UserProfile;
    if (role === 'admin') {
      chosen = DEMO_ADMIN;
    } else if (role === 'executive') {
      chosen = DEMO_EXECUTIVE;
    } else if (role === 'employee') {
      chosen = DEMO_EMPLOYEE;
    } else {
      chosen = DEMO_PENDING;
    }
    setProfile(chosen);
    localStorage.setItem('leedo_current_session', JSON.stringify(chosen));
    // also ensure profile is saved in all users cache
    createUserProfile(chosen);
  };

  // Executive permissions rule:
  // "대표, 이사, 본부장 직급으로 등록되는사람은 관리자 전용 시스템도 같이 볼 수 있게 해줘"
  const isExecutivePosition = ['대표', '이사', '본부장'].includes(profile?.position || '');
  const isAdmin = (profile?.role === 'admin' || isExecutivePosition) && profile?.status === 'active';

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
        isApproved: !!isApproved,
        isPending: !!isPending,
        isRejected: !!isRejected,
        isDeactivated: !!isDeactivated,
        signInWithGoogle,
        registerProfile,
        logout,
        refreshProfile,
        setDemoProfile,
        isDemoMode,
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
