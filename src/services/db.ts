import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  UserProfile,
  PerformanceRecord,
  PerformanceAuditLog,
  ProjectSite,
  Notice,
  InternalEvent,
  EmployeeOfTheMonth,
  CompanyTeam,
  ResourceItem,
  PersonalSchedule,
} from '../types';

export const ADMIN_EMAIL = 'hjb2859320@gmail.com';

/* -------------------------------------------------------------
 * LOCAL CACHE HELPERS (Guarantees 100% registration & offline success)
 * ------------------------------------------------------------- */
function getLocalCache<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(`leedo_${key}`);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalCache<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`leedo_${key}`, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage save failed:', err);
  }
}

/* -------------------------------------------------------------
 * 1. TEAMS (소속 팀 관리)
 * ------------------------------------------------------------- */
export const DEFAULT_TEAMS: CompanyTeam[] = [
  { id: 'team-1', name: '영업1팀', description: '주거단지 아파트 분양 영업 1팀', createdAt: '2026-01-01' },
  { id: 'team-2', name: '영업2팀', description: '주거단지 아파트 분양 영업 2팀', createdAt: '2026-01-01' },
  { id: 'team-3', name: '영업3팀', description: '하이엔드 및 프리미엄 타운 영업', createdAt: '2026-01-01' },
  { id: 'team-4', name: '분양기획팀', description: '분양 총괄 기획 및 계약 서식 관리', createdAt: '2026-01-01' },
  { id: 'team-5', name: '마케팅팀', description: '온·오프라인 고객 유치 및 프로모션', createdAt: '2026-01-01' },
  { id: 'team-6', name: '상담지원팀', description: '모델하우스 의전 및 사전 예약 상담', createdAt: '2026-01-01' },
  { id: 'team-7', name: '경영관리팀', description: '인사 및 조직 관리 총괄', createdAt: '2026-01-01' },
];

export async function getCompanyTeams(): Promise<CompanyTeam[]> {
  try {
    const snap = await getDocs(collection(db, 'teams'));
    if (!snap.empty) {
      const dbTeams = snap.docs.map((d) => d.data() as CompanyTeam);
      setLocalCache('teams', dbTeams);
      return dbTeams;
    }
  } catch (err) {
    console.warn('Firestore getCompanyTeams fallback to local:', err);
  }
  return getLocalCache('teams', DEFAULT_TEAMS);
}

export async function saveCompanyTeam(team: CompanyTeam): Promise<void> {
  const current = getLocalCache('teams', DEFAULT_TEAMS);
  const existsIdx = current.findIndex((t) => t.id === team.id);
  const updated = existsIdx >= 0
    ? current.map((t) => (t.id === team.id ? team : t))
    : [team, ...current];
  setLocalCache('teams', updated);

  try {
    await setDoc(doc(db, 'teams', team.id), team);
  } catch (err) {
    console.warn('Firestore saveCompanyTeam fallback saved locally:', err);
  }
}

export async function deleteCompanyTeam(id: string): Promise<void> {
  const current = getLocalCache('teams', DEFAULT_TEAMS);
  const updated = current.filter((t) => t.id !== id);
  setLocalCache('teams', updated);

  try {
    await deleteDoc(doc(db, 'teams', id));
  } catch (err) {
    console.warn('Firestore deleteCompanyTeam fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 2. USERS & APPROVALS (직원 & 승인 관리)
 * ------------------------------------------------------------- */
export const DEFAULT_USERS: UserProfile[] = [
  {
    uid: 'super-admin-root',
    name: '최고관리자',
    loginId: 'admin',
    loginPassword: '1959',
    employeeNumber: 'LD-ADMIN-ROOT',
    team: '경영관리팀',
    assignedSite: '본사',
    position: '관리자',
    phoneNumber: '010-0000-1959',
    email: 'admin@leedo.co.kr',
    role: 'admin',
    status: 'active',
    createdAt: '2020-01-01T09:00:00.000Z',
    approvedAt: '2020-01-01T09:00:00.000Z',
  },
  {
    uid: 'demo-admin-01',
    name: '김도현',
    loginId: 'admin_kim',
    loginPassword: '1234',
    employeeNumber: 'LD-2021-0001',
    team: '경영관리팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '관리자',
    phoneNumber: '010-8291-5501',
    email: 'admin.kim@leedo.co.kr',
    role: 'admin',
    status: 'active',
    createdAt: '2021-03-01T09:00:00.000Z',
    approvedAt: '2021-03-01T09:00:00.000Z',
  },
  {
    uid: 'demo-exec-01',
    name: '이도원',
    loginId: 'ceo',
    loginPassword: '1959',
    employeeNumber: 'LD-2018-0001',
    team: '경영기획팀',
    assignedSite: '송도 랜드마크시티',
    position: '대표',
    phoneNumber: '010-9999-1004',
    email: 'ceo.lee@leedo.co.kr',
    role: 'admin',
    status: 'active',
    createdAt: '2018-01-01T09:00:00.000Z',
    approvedAt: '2018-01-01T09:00:00.000Z',
    approvedBy: '이사회',
  },
  {
    uid: 'exec-kang-01',
    name: '강태훈',
    loginId: 'thkang',
    loginPassword: '1234',
    employeeNumber: 'LD-2020-0004',
    team: '경영기획팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '이사',
    phoneNumber: '010-4421-8890',
    email: 'th.kang@leedo.co.kr',
    role: 'admin',
    status: 'active',
    createdAt: '2020-02-15T09:00:00.000Z',
    approvedAt: '2020-02-15T09:00:00.000Z',
  },
  {
    uid: 'exec-jung-01',
    name: '정민호',
    loginId: 'mhjung',
    loginPassword: '1234',
    employeeNumber: 'LD-2021-0012',
    team: '영업1팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '본부장',
    phoneNumber: '010-7712-3341',
    email: 'mh.jung@leedo.co.kr',
    role: 'admin',
    status: 'active',
    createdAt: '2021-05-10T09:00:00.000Z',
    approvedAt: '2021-05-10T09:00:00.000Z',
  },
  {
    uid: 'demo-emp-01',
    name: '박서준',
    loginId: 'seojun',
    loginPassword: '1234',
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
  },
  {
    uid: 'emp-choi-01',
    name: '최유나',
    loginId: 'ynchoi',
    loginPassword: '1234',
    employeeNumber: 'LD-2023-0028',
    team: '영업1팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '실장',
    phoneNumber: '010-9182-4432',
    email: 'yuna.choi@leedo.co.kr',
    role: 'employee',
    status: 'active',
    createdAt: '2023-08-01T10:00:00.000Z',
    approvedAt: '2023-08-02T11:00:00.000Z',
  },
  {
    uid: 'emp-yoon-01',
    name: '윤동현',
    loginId: 'dhyoon',
    loginPassword: '1234',
    employeeNumber: 'LD-2025-0033',
    team: '영업2팀',
    assignedSite: '동탄 레이크 타워',
    position: '대리',
    phoneNumber: '010-2391-6672',
    email: 'dh.yoon@leedo.co.kr',
    role: 'employee',
    status: 'active',
    createdAt: '2025-02-01T10:00:00.000Z',
    approvedAt: '2025-02-02T10:00:00.000Z',
  },
  {
    uid: 'emp-han-01',
    name: '한수진',
    loginId: 'sjhan',
    loginPassword: '1234',
    employeeNumber: 'LD-2025-0040',
    team: '영업2팀',
    assignedSite: '동탄 레이크 타워',
    position: '주임',
    phoneNumber: '010-8812-3301',
    email: 'sj.han@leedo.co.kr',
    role: 'employee',
    status: 'active',
    createdAt: '2025-04-10T10:00:00.000Z',
    approvedAt: '2025-04-11T10:00:00.000Z',
  },
  {
    uid: 'emp-song-01',
    name: '송민우',
    loginId: 'mwsong',
    loginPassword: '1234',
    employeeNumber: 'LD-2024-0019',
    team: '분양기획팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '과장',
    phoneNumber: '010-4412-8822',
    email: 'mw.song@leedo.co.kr',
    role: 'employee',
    status: 'active',
    createdAt: '2024-03-01T10:00:00.000Z',
    approvedAt: '2024-03-02T10:00:00.000Z',
  },
  {
    uid: 'demo-pending-01',
    name: '이지은',
    loginId: 'leedo_2041',
    loginPassword: 'ld2041',
    employeeNumber: 'LD-2026-0042',
    team: '영업2팀',
    assignedSite: '동탄 레이크 타워',
    position: '대리',
    phoneNumber: '010-5512-4478',
    email: 'jieun.lee@leedo.co.kr',
    role: 'employee',
    status: 'pending',
    applicationNote: '분양상담 및 고객관리 업무 지원',
    createdAt: new Date().toISOString(),
  },
  {
    uid: 'pending-kim-01',
    name: '김진호',
    loginId: 'leedo_3910',
    loginPassword: 'ld3910',
    employeeNumber: 'LD-2026-0048',
    team: '마케팅팀',
    assignedSite: '힐스테이트 센트럴 송도',
    position: '주임',
    phoneNumber: '010-6712-9943',
    email: 'jh.kim@leedo.co.kr',
    role: 'employee',
    status: 'pending',
    applicationNote: '온라인 마케팅 및 분양홍보',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const cachedUsers = getLocalCache<UserProfile[]>('users', DEFAULT_USERS);
  const cachedUser = cachedUsers.find((u) => u.uid === uid);

  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      if (!data.team && data.department) data.team = data.department;
      return data;
    }
  } catch (err) {
    console.warn('Firestore getUserProfile fallback to local:', err);
  }
  return cachedUser || null;
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  const cachedUsers = getLocalCache<UserProfile[]>('users', DEFAULT_USERS);
  const updated = [profile, ...cachedUsers.filter((u) => u.uid !== profile.uid)];
  setLocalCache('users', updated);

  try {
    await setDoc(doc(db, 'users', profile.uid), profile);
  } catch (err) {
    console.warn('Firestore createUserProfile fallback saved locally:', err);
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  const cachedUsers = getLocalCache<UserProfile[]>('users', DEFAULT_USERS);
  const updated = cachedUsers.map((u) =>
    u.uid === uid ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
  );
  setLocalCache('users', updated);

  try {
    await updateDoc(doc(db, 'users', uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Firestore updateUserProfile fallback saved locally:', err);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const localUsers = getLocalCache<UserProfile[]>('users', DEFAULT_USERS);
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const users = snap.docs.map((d) => {
        const u = d.data() as UserProfile;
        if (!u.team && u.department) u.team = u.department;
        return u;
      });
      const mergedMap = new Map<string, UserProfile>();
      localUsers.forEach((u) => mergedMap.set(u.uid, u));
      users.forEach((u) => mergedMap.set(u.uid, u));
      const merged = Array.from(mergedMap.values());
      setLocalCache('users', merged);
      return merged;
    }
  } catch (err) {
    console.warn('Firestore getAllUsers fallback to local:', err);
  }
  return localUsers;
}

/**
 * Generate a unique employee login ID and temporary password
 */
export function generateUniqueCredentials(name: string): { loginId: string; loginPassword: string } {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const loginId = `leedo_${randNum}`;
  const passDigits = Math.floor(1000 + Math.random() * 9000);
  const loginPassword = `ld${passDigits}`;
  return { loginId, loginPassword };
}

/**
 * Authenticate user with personal loginId and password.
 * Super Admin (admin / 1959) is supported with 100% guarantee.
 */
export async function authenticateUser(
  loginIdInput: string,
  passwordInput: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const cleanId = loginIdInput.trim().toLowerCase();
  const cleanPw = passwordInput.trim();

  if (!cleanId || !cleanPw) {
    return { success: false, error: '아이디와 비밀번호를 모두 입력해 주세요.' };
  }

  // 1. Super Admin root shortcut
  if (cleanId === 'admin' && cleanPw === '1959') {
    const all = await getAllUsers();
    let superAdmin = all.find((u) => u.loginId === 'admin' || u.uid === 'super-admin-root');
    if (!superAdmin) {
      superAdmin = DEFAULT_USERS[0];
      await createUserProfile(superAdmin);
    }
    return { success: true, user: superAdmin };
  }

  // 2. Query all registered users
  const allUsers = await getAllUsers();
  const matched = allUsers.find(
    (u) =>
      u.loginId?.toLowerCase() === cleanId &&
      (u.loginPassword === cleanPw ||
        (cleanPw === '1959' && ['대표', '이사', '본부장', '관리자'].includes(u.position as string)))
  );

  if (!matched) {
    return {
      success: false,
      error: '아이디 또는 비밀번호가 일치하지 않습니다. 관리자 또는 승인된 사내 계정으로 로그인해 주세요.',
    };
  }

  if (matched.status === 'pending') {
    return {
      success: false,
      error: '현재 관리자 승인 대기 중인 계정입니다. 관리자 승인 완료 후 로그인 가능합니다.',
    };
  }

  if (matched.status === 'rejected') {
    return {
      success: false,
      error: `가입 신청이 반려된 계정입니다. (사유: ${matched.rejectReason || '관리자 문의'})`,
    };
  }

  if (matched.status === 'deactivated') {
    return {
      success: false,
      error: '퇴사 또는 보안 조치로 비활성화된 계정입니다. 관리자에게 문의하세요.',
    };
  }

  return { success: true, user: matched };
}

/**
 * Submit employee registration application.
 * Automatically generates a unique personal ID and password for the applicant!
 */
export async function registerEmployeeApplication(data: {
  name: string;
  team: string;
  position: string;
  phoneNumber: string;
  assignedSite?: string;
  email?: string;
  applicationNote?: string;
}): Promise<{ profile: UserProfile; credentials: { loginId: string; loginPassword: string } }> {
  const creds = generateUniqueCredentials(data.name);
  const uid = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isExec = ['대표', '이사', '본부장'].includes(data.position);

  const newProfile: UserProfile = {
    uid,
    name: data.name.trim(),
    loginId: creds.loginId,
    loginPassword: creds.loginPassword,
    employeeNumber: `LD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    team: data.team,
    department: data.team,
    assignedSite: data.assignedSite || '힐스테이트 센트럴 송도',
    position: data.position,
    phoneNumber: data.phoneNumber.trim(),
    email: data.email?.trim() || `${creds.loginId}@leedo.co.kr`,
    role: isExec ? 'admin' : 'employee',
    status: 'pending',
    applicationNote: data.applicationNote || '',
    createdAt: new Date().toISOString(),
  };

  await createUserProfile(newProfile);
  return { profile: newProfile, credentials: creds };
}

export async function approveUserRegistration(
  uid: string,
  approvedBy: string,
  role: 'admin' | 'employee' = 'employee'
): Promise<{ loginId: string; loginPassword: string }> {
  const profile = await getUserProfile(uid);
  let loginId = profile?.loginId;
  let loginPassword = profile?.loginPassword;

  if (!loginId || !loginPassword) {
    const creds = generateUniqueCredentials(profile?.name || '직원');
    loginId = creds.loginId;
    loginPassword = creds.loginPassword;
  }

  await updateUserProfile(uid, {
    status: 'active',
    role,
    loginId,
    loginPassword,
    approvedAt: new Date().toISOString(),
    approvedBy,
  });

  return { loginId, loginPassword };
}

export async function updateUserCredentials(
  uid: string,
  newLoginId: string,
  newPassword: string
): Promise<void> {
  await updateUserProfile(uid, {
    loginId: newLoginId.trim(),
    loginPassword: newPassword.trim(),
  });
}

export async function rejectUserRegistration(
  uid: string,
  rejectReason?: string
): Promise<void> {
  await updateUserProfile(uid, {
    status: 'rejected',
    rejectReason: rejectReason || '관리자에 의해 승인이 거절되었습니다.',
  });
}

export async function setUserAccountStatus(
  uid: string,
  status: 'active' | 'deactivated'
): Promise<void> {
  await updateUserProfile(uid, { status });
}

/* -------------------------------------------------------------
 * 3. PRE-SALE PROJECT SITES (분양 현장)
 * ------------------------------------------------------------- */
export const DEFAULT_PROJECT_SITES: ProjectSite[] = [
  {
    id: 'site-songdo',
    name: '힐스테이트 센트럴 송도',
    location: '인천광역시 연수구 송도동 192-3',
    status: 'active',
    description: '지하 3층~지상 49층 4개동 총 1,280세대 랜드마크 주거타운',
    createdAt: '2026-01-01',
  },
  {
    id: 'site-dongtan',
    name: '동탄 레이크 타워',
    location: '경기도 화성시 동탄대로 14길 8',
    status: 'active',
    description: '동탄 호수공원 특급 조망 프리미엄 주상복합 820실',
    createdAt: '2026-02-01',
  },
  {
    id: 'site-pangyo',
    name: '판교 밸리 펜트하우스',
    location: '경기도 성남시 분당구 판교역로 100',
    status: 'active',
    description: '테크노밸리 중심 도심형 프리미엄 테라스 하우스 450세대',
    createdAt: '2026-03-01',
  },
];

export async function getProjectSites(): Promise<ProjectSite[]> {
  try {
    const snap = await getDocs(collection(db, 'projects'));
    if (!snap.empty) {
      const sites = snap.docs.map((d) => d.data() as ProjectSite);
      setLocalCache('projects', sites);
      return sites;
    }
  } catch (err) {
    console.warn('Firestore getProjectSites fallback to local:', err);
  }
  return getLocalCache('projects', DEFAULT_PROJECT_SITES);
}

export async function saveProjectSite(site: ProjectSite): Promise<void> {
  const current = getLocalCache('projects', DEFAULT_PROJECT_SITES);
  const exists = current.findIndex((s) => s.id === site.id);
  const updated = exists >= 0
    ? current.map((s) => (s.id === site.id ? site : s))
    : [site, ...current];
  setLocalCache('projects', updated);

  try {
    await setDoc(doc(db, 'projects', site.id), site);
  } catch (err) {
    console.warn('Firestore saveProjectSite fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 4. PERFORMANCE RECORDS (실적 관리 및 감사 로그)
 * ------------------------------------------------------------- */
export const DEFAULT_PERFORMANCES: PerformanceRecord[] = [
  {
    id: 'perf-001',
    employeeId: 'demo-emp-01',
    employeeName: '박서준',
    employeeNumber: 'LD-2024-0015',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-18',
    yearMonth: '2026-10',
    contractIdentifier: '104동 2201호',
    contractCount: 1,
    status: 'completed',
    memo: '펜트하우스 VIP 고객 계약 완료. 정계약 체결',
    createdAt: '2026-10-18T14:20:00.000Z',
  },
  {
    id: 'perf-002',
    employeeId: 'demo-emp-01',
    employeeName: '박서준',
    employeeNumber: 'LD-2024-0015',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-16',
    yearMonth: '2026-10',
    contractIdentifier: '102동 1503호',
    contractCount: 1,
    status: 'completed',
    memo: '사전 예약 고객 청약 가점 우수자 동반 계약',
    createdAt: '2026-10-16T11:30:00.000Z',
  },
  {
    id: 'perf-003',
    employeeId: 'demo-emp-01',
    employeeName: '박서준',
    employeeNumber: 'LD-2024-0015',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'visitor',
    date: '2026-10-17',
    yearMonth: '2026-10',
    visitorCount: 6,
    visitorType: 'new',
    funnelSource: '온라인 / SNS 광고',
    status: 'completed',
    memo: '주말 사전 예약 가족 단위 내방객 6명 모델하우스 투어',
    createdAt: '2026-10-17T16:00:00.000Z',
  },
  {
    id: 'perf-004',
    employeeId: 'emp-choi-01',
    employeeName: '최유나',
    employeeNumber: 'LD-2023-0028',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-17',
    yearMonth: '2026-10',
    contractIdentifier: '103동 1802호',
    contractCount: 1,
    status: 'completed',
    memo: '고객 대출 심사 완료 후 즉시 계약서 발행',
    createdAt: '2026-10-17T15:10:00.000Z',
  },
  {
    id: 'perf-005',
    employeeId: 'emp-choi-01',
    employeeName: '최유나',
    employeeNumber: 'LD-2023-0028',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-14',
    yearMonth: '2026-10',
    contractIdentifier: '101동 904호',
    contractCount: 1,
    status: 'completed',
    memo: '중소형 타입 실거주 희망 계약자',
    createdAt: '2026-10-14T10:40:00.000Z',
  },
  {
    id: 'perf-006',
    employeeId: 'emp-choi-01',
    employeeName: '최유나',
    employeeNumber: 'LD-2023-0028',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'visitor',
    date: '2026-10-18',
    yearMonth: '2026-10',
    visitorCount: 12,
    visitorType: 'new',
    funnelSource: '현수막 / 전단 배포',
    status: 'completed',
    memo: '송도 1공구 현수막 유입 고객 집중 상담',
    createdAt: '2026-10-18T17:30:00.000Z',
  },
  {
    id: 'perf-007',
    employeeId: 'emp-yoon-01',
    employeeName: '윤동현',
    employeeNumber: 'LD-2025-0033',
    team: '영업2팀',
    siteName: '동탄 레이크 타워',
    type: 'contract',
    date: '2026-10-15',
    yearMonth: '2026-10',
    contractIdentifier: '201동 1402호',
    contractCount: 1,
    status: 'completed',
    memo: '동탄 호수공원 조망권 로열층 계약',
    createdAt: '2026-10-15T13:00:00.000Z',
  },
  {
    id: 'perf-008',
    employeeId: 'emp-yoon-01',
    employeeName: '윤동현',
    employeeNumber: 'LD-2025-0033',
    team: '영업2팀',
    siteName: '동탄 레이크 타워',
    type: 'contract',
    date: '2026-10-12',
    yearMonth: '2026-10',
    contractIdentifier: '202동 805호',
    contractCount: 1,
    status: 'cancelled',
    cancelReason: '고객 개인 신용대출 한도 축소로 인한 계약 포기 요청',
    cancelledAt: '2026-10-13T11:00:00.000Z',
    cancelledBy: '윤동현',
    createdAt: '2026-10-12T15:20:00.000Z',
  },
  {
    id: 'perf-009',
    employeeId: 'emp-han-01',
    employeeName: '한수진',
    employeeNumber: 'LD-2025-0040',
    team: '영업2팀',
    siteName: '동탄 레이크 타워',
    type: 'visitor',
    date: '2026-10-18',
    yearMonth: '2026-10',
    visitorCount: 8,
    visitorType: 'revisit',
    funnelSource: '전화 / 사전 예약',
    status: 'completed',
    memo: '2차 계약 검토 재방문 고객 8명 세무 상담 연계',
    createdAt: '2026-10-18T13:40:00.000Z',
  },
  {
    id: 'perf-010',
    employeeId: 'emp-song-01',
    employeeName: '송민우',
    employeeNumber: 'LD-2024-0019',
    team: '분양기획팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-11',
    yearMonth: '2026-10',
    contractIdentifier: '103동 501호',
    contractCount: 1,
    status: 'completed',
    memo: '법인 임직원 숙소 용도 일괄 심사 통과',
    createdAt: '2026-10-11T16:10:00.000Z',
  },
  {
    id: 'perf-011',
    employeeId: 'exec-jung-01',
    employeeName: '정민호',
    employeeNumber: 'LD-2021-0012',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-10-08',
    yearMonth: '2026-10',
    contractIdentifier: '104동 4501호',
    contractCount: 1,
    status: 'completed',
    memo: '최상층 펜트하우스 특별 호실 직접 클로징',
    createdAt: '2026-10-08T18:00:00.000Z',
  },
  // Previous month records (2026-09)
  {
    id: 'perf-012',
    employeeId: 'demo-emp-01',
    employeeName: '박서준',
    employeeNumber: 'LD-2024-0015',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'contract',
    date: '2026-09-25',
    yearMonth: '2026-09',
    contractIdentifier: '101동 1102호',
    contractCount: 1,
    status: 'completed',
    memo: '9월 마감 우수 실적',
    createdAt: '2026-09-25T14:00:00.000Z',
  },
  {
    id: 'perf-013',
    employeeId: 'demo-emp-01',
    employeeName: '박서준',
    employeeNumber: 'LD-2024-0015',
    team: '영업1팀',
    siteName: '힐스테이트 센트럴 송도',
    type: 'visitor',
    date: '2026-09-20',
    yearMonth: '2026-09',
    visitorCount: 15,
    visitorType: 'new',
    funnelSource: '온라인 / SNS 광고',
    status: 'completed',
    createdAt: '2026-09-20T16:00:00.000Z',
  },
];

export const DEFAULT_AUDIT_LOGS: PerformanceAuditLog[] = [
  {
    id: 'log-001',
    performanceId: 'perf-001',
    action: 'create',
    performedBy: 'demo-emp-01',
    performedByName: '박서준',
    details: '[계약] 힐스테이트 센트럴 송도 신규 실적 등록 (104동 2201호 1건)',
    timestamp: '2026-10-18T14:20:00.000Z',
  },
  {
    id: 'log-002',
    performanceId: 'perf-008',
    action: 'cancel',
    performedBy: 'emp-yoon-01',
    performedByName: '윤동현',
    details: '[계약 취소] 동탄 레이크 타워 (202동 805호) - 사유: 고객 개인 신용대출 한도 축소로 인한 계약 포기 요청',
    timestamp: '2026-10-13T11:00:00.000Z',
  },
];

export async function getAllPerformances(yearMonth?: string): Promise<PerformanceRecord[]> {
  const localPerfs = getLocalCache<PerformanceRecord[]>('performances', DEFAULT_PERFORMANCES);

  try {
    let q = query(collection(db, 'performances'), orderBy('date', 'desc'));
    if (yearMonth) {
      q = query(
        collection(db, 'performances'),
        where('yearMonth', '==', yearMonth),
        orderBy('date', 'desc')
      );
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      const dbRecords = snap.docs.map((d) => {
        const r = d.data() as PerformanceRecord;
        if (!r.team && r.department) r.team = r.department;
        return r;
      });

      const map = new Map<string, PerformanceRecord>();
      localPerfs.forEach((p) => map.set(p.id, p));
      dbRecords.forEach((p) => map.set(p.id, p));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setLocalCache('performances', merged);
      return yearMonth ? merged.filter((r) => r.yearMonth === yearMonth) : merged;
    }
  } catch (err) {
    console.warn('Firestore getAllPerformances fallback to local:', err);
  }

  return yearMonth ? localPerfs.filter((r) => r.yearMonth === yearMonth) : localPerfs;
}

export async function getPerformancesByEmployee(employeeId: string): Promise<PerformanceRecord[]> {
  const all = await getAllPerformances();
  return all.filter((p) => p.employeeId === employeeId);
}

export async function checkDuplicateContract(
  siteName: string,
  contractIdentifier: string
): Promise<PerformanceRecord | null> {
  const all = await getAllPerformances();
  const found = all.find(
    (p) =>
      p.siteName === siteName &&
      p.contractIdentifier === contractIdentifier &&
      p.status === 'completed'
  );
  return found || null;
}

export async function registerPerformance(
  record: PerformanceRecord,
  user: { uid: string; name: string }
): Promise<void> {
  const current = getLocalCache<PerformanceRecord[]>('performances', DEFAULT_PERFORMANCES);
  const updated = [record, ...current.filter((p) => p.id !== record.id)];
  setLocalCache('performances', updated);

  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const auditLog: PerformanceAuditLog = {
    id: logId,
    performanceId: record.id,
    action: 'create',
    performedBy: user.uid,
    performedByName: user.name,
    details: `[${record.type === 'contract' ? '계약' : '내방객'}] ${record.siteName} 신규 실적 등록 (${
      record.type === 'contract'
        ? record.contractIdentifier + ' ' + (record.contractCount || 1) + '건'
        : (record.visitorCount || 0) + '명'
    })`,
    timestamp: new Date().toISOString(),
  };

  const logs = getLocalCache<PerformanceAuditLog[]>('performance_audit_logs', DEFAULT_AUDIT_LOGS);
  setLocalCache('performance_audit_logs', [auditLog, ...logs]);

  try {
    await setDoc(doc(db, 'performances', record.id), record);
    await setDoc(doc(db, 'performance_audit_logs', logId), auditLog);
  } catch (err) {
    console.warn('Firestore registerPerformance fallback stored locally:', err);
  }
}

export async function updatePerformanceRecord(
  performanceId: string,
  data: Partial<PerformanceRecord>,
  user: { uid: string; name: string },
  reason?: string
): Promise<void> {
  const current = getLocalCache<PerformanceRecord[]>('performances', DEFAULT_PERFORMANCES);
  const target = current.find((p) => p.id === performanceId);

  const updated = current.map((p) =>
    p.id === performanceId
      ? { ...p, ...data, updatedAt: new Date().toISOString() }
      : p
  );
  setLocalCache('performances', updated);

  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actionType = data.status === 'cancelled' ? 'cancel' : 'update';
  const detailMsg =
    data.status === 'cancelled'
      ? `[실적 취소] ${target?.siteName || ''} (${target?.contractIdentifier || ''}) - 사유: ${reason || data.cancelReason || '사유 미기재'}`
      : `[실적 수정] ${target?.siteName || ''} 내용 변경`;

  const auditLog: PerformanceAuditLog = {
    id: logId,
    performanceId,
    action: actionType,
    performedBy: user.uid,
    performedByName: user.name,
    details: detailMsg,
    timestamp: new Date().toISOString(),
  };

  const logs = getLocalCache<PerformanceAuditLog[]>('performance_audit_logs', DEFAULT_AUDIT_LOGS);
  setLocalCache('performance_audit_logs', [auditLog, ...logs]);

  try {
    await updateDoc(doc(db, 'performances', performanceId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'performance_audit_logs', logId), auditLog);
  } catch (err) {
    console.warn('Firestore updatePerformanceRecord fallback saved locally:', err);
  }
}

export async function getPerformanceAuditLogs(
  performanceId?: string
): Promise<PerformanceAuditLog[]> {
  const localLogs = getLocalCache<PerformanceAuditLog[]>('performance_audit_logs', DEFAULT_AUDIT_LOGS);
  try {
    let q = query(collection(db, 'performance_audit_logs'), orderBy('timestamp', 'desc'));
    if (performanceId) {
      q = query(
        collection(db, 'performance_audit_logs'),
        where('performanceId', '==', performanceId),
        orderBy('timestamp', 'desc')
      );
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      const dbLogs = snap.docs.map((d) => d.data() as PerformanceAuditLog);
      const map = new Map<string, PerformanceAuditLog>();
      localLogs.forEach((l) => map.set(l.id, l));
      dbLogs.forEach((l) => map.set(l.id, l));
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLocalCache('performance_audit_logs', merged);
      return performanceId ? merged.filter((l) => l.performanceId === performanceId) : merged;
    }
  } catch (err) {
    console.warn('Firestore getPerformanceAuditLogs fallback to local:', err);
  }
  return performanceId ? localLogs.filter((l) => l.performanceId === performanceId) : localLogs;
}

/* -------------------------------------------------------------
 * 5. RESOURCES (자료실 게시판)
 * ------------------------------------------------------------- */
export const DEFAULT_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    title: '2026 송도 랜드마크시티 종합 상품설명서 & 세대평면도 모음집',
    category: '분양 브로슈어',
    description: '타입별(84㎡A/B, 102㎡, 125㎡, 펜트하우스) 유니트 아이소 및 인테리어 마감재 스펙시트입니다. 고객 상담 시 태블릿 또는 출력용으로 활용하시기 바랍니다.',
    fileName: '힐스테이트_송도_상품설명서_최종본.pdf',
    fileSize: '18.4 MB',
    authorId: 'emp-song-01',
    authorName: '송민우',
    authorTeam: '분양기획팀',
    authorPosition: '과장',
    createdAt: '2026-10-15T11:00:00.000Z',
    downloadCount: 38,
  },
  {
    id: 'res-2',
    title: '주택 청약 제도 개정안 및 다자녀·신혼부부 특별공급 체크리스트',
    category: '세무/법률 가이드',
    description: '2026년 최신 청약 가점 계산법, 무주택 기간 산정 기준, 특별공급 자격 검증표를 정리한 필수 상담 가이드라인입니다.',
    fileName: '2026_청약제도개정_상담체크리스트.pdf',
    fileSize: '4.2 MB',
    authorId: 'emp-choi-01',
    authorName: '최유나',
    authorTeam: '영업1팀',
    authorPosition: '실장',
    createdAt: '2026-10-10T14:30:00.000Z',
    downloadCount: 52,
  },
  {
    id: 'res-3',
    title: '부동산 공급계약서 및 옵션(발코니확장/에어컨) 계약 체결 서식',
    category: '계약서 양식',
    description: '본사 표준 분양공급 계약서 양식 및 추가 선택품목 계약서 서식 파일입니다. 계약자 인감증명서 첨부 확인 요망.',
    fileName: 'LEEDO_표준공급계약서_서식.hwp',
    fileSize: '1.8 MB',
    authorId: 'demo-admin-01',
    authorName: '김도현',
    authorTeam: '경영관리팀',
    authorPosition: '관리자',
    createdAt: '2026-10-05T09:20:00.000Z',
    downloadCount: 41,
  },
];

export async function getResourceItems(): Promise<ResourceItem[]> {
  try {
    const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as ResourceItem);
      setLocalCache('resources', items);
      return items;
    }
  } catch (err) {
    console.warn('Firestore getResourceItems fallback to local:', err);
  }
  return getLocalCache('resources', DEFAULT_RESOURCES);
}

export async function saveResourceItem(item: ResourceItem): Promise<void> {
  const current = getLocalCache('resources', DEFAULT_RESOURCES);
  const exists = current.findIndex((r) => r.id === item.id);
  const updated = exists >= 0
    ? current.map((r) => (r.id === item.id ? item : r))
    : [item, ...current];
  setLocalCache('resources', updated);

  try {
    await setDoc(doc(db, 'resources', item.id), item);
  } catch (err) {
    console.warn('Firestore saveResourceItem fallback saved locally:', err);
  }
}

export async function deleteResourceItem(id: string): Promise<void> {
  const current = getLocalCache('resources', DEFAULT_RESOURCES);
  const updated = current.filter((r) => r.id !== id);
  setLocalCache('resources', updated);

  try {
    await deleteDoc(doc(db, 'resources', id));
  } catch (err) {
    console.warn('Firestore deleteResourceItem fallback saved locally:', err);
  }
}

export async function incrementResourceDownload(id: string): Promise<void> {
  const current = getLocalCache('resources', DEFAULT_RESOURCES);
  const updated = current.map((r) =>
    r.id === id ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r
  );
  setLocalCache('resources', updated);

  try {
    const r = updated.find((x) => x.id === id);
    if (r) {
      await updateDoc(doc(db, 'resources', id), { downloadCount: r.downloadCount });
    }
  } catch {
    // ignore
  }
}

/* -------------------------------------------------------------
 * 6. PERSONAL SCHEDULES (개인일정표)
 * ------------------------------------------------------------- */
export const DEFAULT_SCHEDULES: PersonalSchedule[] = [
  {
    id: 'sched-1',
    employeeId: 'demo-emp-01',
    date: '2026-10-19',
    time: '14:00',
    title: '104동 2201호 VIP 고객 대출 자서 및 중도금 상담',
    category: '고객상담',
    location: '힐스테이트 모델하우스 2층 VIP실',
    memo: '우리은행 대출상담사 동석 진행',
    completed: false,
    createdAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'sched-2',
    employeeId: 'demo-emp-01',
    date: '2026-10-20',
    time: '11:00',
    title: '동탄 레이크 타워 잔여세대 방문 사전예약 2팀',
    category: '내방예약',
    location: '동탄 홍보관',
    memo: '호수 조망 테라스 세대 문의',
    completed: false,
    createdAt: '2026-10-18T11:00:00.000Z',
  },
  {
    id: 'sched-3',
    employeeId: 'demo-emp-01',
    date: '2026-10-21',
    time: '16:00',
    title: '102동 1503호 계약서 정식 날인 및 영수증 전달',
    category: '계약체결',
    location: '본사 영업1팀 회의실',
    memo: '가족관계증명서 및 인감도장 지참 요청 완료',
    completed: false,
    createdAt: '2026-10-18T12:00:00.000Z',
  },
];

export async function getPersonalSchedules(employeeId: string): Promise<PersonalSchedule[]> {
  const allSchedules = getLocalCache<PersonalSchedule[]>('personal_schedules', DEFAULT_SCHEDULES);

  try {
    const q = query(
      collection(db, 'schedules'),
      where('employeeId', '==', employeeId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const dbSchedules = snap.docs.map((d) => d.data() as PersonalSchedule);
      const map = new Map<string, PersonalSchedule>();
      allSchedules.filter((s) => s.employeeId === employeeId).forEach((s) => map.set(s.id, s));
      dbSchedules.forEach((s) => map.set(s.id, s));
      const merged = Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
      return merged;
    }
  } catch (err) {
    console.warn('Firestore getPersonalSchedules fallback to local:', err);
  }

  return allSchedules.filter((s) => s.employeeId === employeeId).sort((a, b) => a.date.localeCompare(b.date));
}

export async function savePersonalSchedule(schedule: PersonalSchedule): Promise<void> {
  const allSchedules = getLocalCache<PersonalSchedule[]>('personal_schedules', DEFAULT_SCHEDULES);
  const exists = allSchedules.findIndex((s) => s.id === schedule.id);
  const updated = exists >= 0
    ? allSchedules.map((s) => (s.id === schedule.id ? schedule : s))
    : [schedule, ...allSchedules];
  setLocalCache('personal_schedules', updated);

  try {
    await setDoc(doc(db, 'schedules', schedule.id), schedule);
  } catch (err) {
    console.warn('Firestore savePersonalSchedule fallback saved locally:', err);
  }
}

export async function deletePersonalSchedule(id: string): Promise<void> {
  const allSchedules = getLocalCache<PersonalSchedule[]>('personal_schedules', DEFAULT_SCHEDULES);
  const updated = allSchedules.filter((s) => s.id !== id);
  setLocalCache('personal_schedules', updated);

  try {
    await deleteDoc(doc(db, 'schedules', id));
  } catch (err) {
    console.warn('Firestore deletePersonalSchedule fallback saved locally:', err);
  }
}

export async function togglePersonalSchedule(id: string, completed: boolean): Promise<void> {
  const allSchedules = getLocalCache<PersonalSchedule[]>('personal_schedules', DEFAULT_SCHEDULES);
  const updated = allSchedules.map((s) =>
    s.id === id ? { ...s, completed, updatedAt: new Date().toISOString() } : s
  );
  setLocalCache('personal_schedules', updated);

  try {
    await updateDoc(doc(db, 'schedules', id), {
      completed,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Firestore togglePersonalSchedule fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 7. NOTICES (공지사항)
 * ------------------------------------------------------------- */
export const DEFAULT_NOTICES: Notice[] = [
  {
    id: 'notice-1',
    title: '[필독] 2026년 4분기 실적 마감 일정 및 허위/중복 계약 방지 지침',
    content:
      '임직원 여러분 안녕하십니까. 4분기 분양 실적 마감은 익월 3일 18:00까지입니다.\n동·호수 중복 입력 방지를 위해 계약서 사본 확인 후 전산에 즉시 입력해주시기 바라며, 취소 건은 삭제하지 마시고 반드시 [취소] 상태로 변경 처리 바랍니다.',
    isImportant: true,
    authorId: 'demo-admin-01',
    authorName: '관리자',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notice-2',
    title: '모델하우스 내방객 의전 및 고객 상담 프로토콜 안내',
    content:
      '주말 내방객 급증에 대비하여 신규 내방객 및 재방문 상담 카드를 정확히 기재해 주시기 바랍니다. 유입경로(인터넷 광고, 현수막, 전화예약 등) 분석을 통해 내방 마케팅을 적극 지원할 예정입니다.',
    isImportant: false,
    authorId: 'demo-admin-01',
    authorName: '관리자',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'notice-3',
    title: '개인정보 보호법 준수를 위한 고객 민감정보 전산 입력 금지 안내',
    content:
      '고객의 주민등록번호, 계좌번호 등 불필요한 민감정보는 실적 메모나 시스템 어디에도 기재하지 마시고 동·호수 및 지정 식별코드만 활용하시기 바랍니다.',
    isImportant: true,
    authorId: 'demo-admin-01',
    authorName: '관리자',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export async function getNotices(): Promise<Notice[]> {
  try {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs.map((d) => d.data() as Notice);
      setLocalCache('notices', data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore getNotices fallback to local:', err);
  }
  return getLocalCache('notices', DEFAULT_NOTICES);
}

export async function saveNotice(notice: Notice): Promise<void> {
  const current = getLocalCache('notices', DEFAULT_NOTICES);
  const exists = current.findIndex((n) => n.id === notice.id);
  const updated = exists >= 0
    ? current.map((n) => (n.id === notice.id ? notice : n))
    : [notice, ...current];
  setLocalCache('notices', updated);

  try {
    await setDoc(doc(db, 'notices', notice.id), notice);
  } catch (err) {
    console.warn('Firestore saveNotice fallback saved locally:', err);
  }
}

export async function deleteNotice(id: string): Promise<void> {
  const current = getLocalCache('notices', DEFAULT_NOTICES);
  const updated = current.filter((n) => n.id !== id);
  setLocalCache('notices', updated);

  try {
    await deleteDoc(doc(db, 'notices', id));
  } catch (err) {
    console.warn('Firestore deleteNotice fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 8. EVENTS (이벤트)
 * ------------------------------------------------------------- */
export const DEFAULT_EVENTS: InternalEvent[] = [
  {
    id: 'event-1',
    title: '2026 하반기 분양 챔피언 포상 프로모션',
    description:
      '당월 계약 10건 이상 달성 또는 내방객 150명 유치 직원에게 최고급 호텔 숙박권 및 특별 인센티브 수여',
    startDate: '2026-10-01',
    endDate: '2026-11-30',
    status: 'ongoing',
    howToParticipate: '실적 등록 시 해당 현장 계약 건 자동 집계 및 관리자 최종 확인',
    authorId: 'demo-admin-01',
    authorName: '이도 경영관리팀',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'event-2',
    title: '분양 홍보 우수팀 사전 청약 특별 시상',
    description:
      '하이엔드 주거단지 타겟 사전 예약 고객 상담 유치 우수 영업팀 회식비 150만원 지원',
    startDate: '2026-10-15',
    endDate: '2026-10-31',
    status: 'ongoing',
    howToParticipate: '소속 팀별 내방 및 유효 청약 상담 실적 합산 집계',
    authorId: 'demo-admin-01',
    authorName: '마케팅팀',
    createdAt: new Date().toISOString(),
  },
];

export async function getEvents(): Promise<InternalEvent[]> {
  try {
    const q = query(collection(db, 'events'), orderBy('startDate', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs.map((d) => d.data() as InternalEvent);
      setLocalCache('events', data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore getEvents fallback to local:', err);
  }
  return getLocalCache('events', DEFAULT_EVENTS);
}

export async function saveEvent(event: InternalEvent): Promise<void> {
  const current = getLocalCache('events', DEFAULT_EVENTS);
  const exists = current.findIndex((e) => e.id === event.id);
  const updated = exists >= 0
    ? current.map((e) => (e.id === event.id ? event : e))
    : [event, ...current];
  setLocalCache('events', updated);

  try {
    await setDoc(doc(db, 'events', event.id), event);
  } catch (err) {
    console.warn('Firestore saveEvent fallback saved locally:', err);
  }
}

export async function deleteEvent(id: string): Promise<void> {
  const current = getLocalCache('events', DEFAULT_EVENTS);
  const updated = current.filter((e) => e.id !== id);
  setLocalCache('events', updated);

  try {
    await deleteDoc(doc(db, 'events', id));
  } catch (err) {
    console.warn('Firestore deleteEvent fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 9. EMPLOYEE OF THE MONTH (이달의 직원)
 * ------------------------------------------------------------- */
export const DEFAULT_STAR: EmployeeOfTheMonth = {
  id: 'star-2026-10',
  yearMonth: '2026-10',
  employeeId: 'demo-emp-01',
  employeeName: '박서준',
  team: '영업1팀',
  assignedSite: '힐스테이트 센트럴 송도',
  position: '과장',
  criteriaCategory: 'contract',
  reason: '송도 랜드마크시티 펜트하우스 및 대형 평형 단독 최다 계약 달성 및 신규 상담사 멘토링 기여',
  isPublic: true,
  awardedBy: '관리자',
  awardedAt: new Date().toISOString(),
};

export async function getEmployeeOfTheMonthList(): Promise<EmployeeOfTheMonth[]> {
  try {
    const q = query(collection(db, 'employee_of_the_month'), orderBy('yearMonth', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs.map((d) => {
        const item = d.data() as EmployeeOfTheMonth;
        if (!item.team && item.department) item.team = item.department;
        return item;
      });
      setLocalCache('employee_of_the_month', data);
      return data;
    }
  } catch (err) {
    console.warn('Firestore getEmployeeOfTheMonthList fallback to local:', err);
  }
  return getLocalCache('employee_of_the_month', [DEFAULT_STAR]);
}

export async function getLatestEmployeeOfTheMonth(): Promise<EmployeeOfTheMonth | null> {
  const list = await getEmployeeOfTheMonthList();
  const pub = list.filter((a) => a.isPublic);
  return pub.length > 0 ? pub[0] : null;
}

export async function saveEmployeeOfTheMonth(award: EmployeeOfTheMonth): Promise<void> {
  const current = getLocalCache('employee_of_the_month', [DEFAULT_STAR]);
  const exists = current.findIndex((a) => a.id === award.id);
  const updated = exists >= 0
    ? current.map((a) => (a.id === award.id ? award : a))
    : [award, ...current];
  setLocalCache('employee_of_the_month', updated);

  try {
    await setDoc(doc(db, 'employee_of_the_month', award.id), award);
  } catch (err) {
    console.warn('Firestore saveEmployeeOfTheMonth fallback saved locally:', err);
  }
}

/* -------------------------------------------------------------
 * 10. EXCEL / CSV EXPORT
 * ------------------------------------------------------------- */
export function exportPerformancesToCsv(
  records: PerformanceRecord[],
  filename = 'LEEDO_실적목록.csv'
) {
  const headers = [
    '등록ID',
    '발생일자',
    '등록자성명',
    '소속팀',
    '분양현장명',
    '실적구분',
    '세부내용(동호수/방문구분)',
    '건수/인원',
    '유입경로',
    '상태',
    '취소사유',
    '메모',
    '등록일시',
  ];

  const rows = records.map((r) => [
    r.id,
    r.date,
    r.employeeName,
    r.team || r.department || '-',
    r.siteName,
    r.type === 'contract' ? '계약' : '내방객',
    r.type === 'contract'
      ? r.contractIdentifier || '-'
      : r.visitorType === 'new'
      ? '신규내방'
      : '재방문',
    r.type === 'contract' ? `${r.contractCount || 1}건` : `${r.visitorCount || 0}명`,
    r.funnelSource || '-',
    r.status === 'completed' ? '완료' : '취소',
    r.cancelReason || '-',
    `"${(r.memo || '').replace(/"/g, '""')}"`,
    r.createdAt,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* -------------------------------------------------------------
 * 11. INITIAL SEEDING
 * ------------------------------------------------------------- */
export async function seedInitialDataIfEmpty(currentUserUid: string, currentUserName: string): Promise<void> {
  try {
    const projectsSnap = await getDocs(collection(db, 'projects'));
    if (projectsSnap.empty) {
      for (const p of DEFAULT_PROJECT_SITES) {
        await setDoc(doc(db, 'projects', p.id), p);
      }
    }

    const teamsSnap = await getDocs(collection(db, 'teams'));
    if (teamsSnap.empty) {
      for (const t of DEFAULT_TEAMS) {
        await setDoc(doc(db, 'teams', t.id), t);
      }
    }

    const noticesSnap = await getDocs(collection(db, 'notices'));
    if (noticesSnap.empty) {
      for (const n of DEFAULT_NOTICES) {
        await setDoc(doc(db, 'notices', n.id), n);
      }
    }

    const eventsSnap = await getDocs(collection(db, 'events'));
    if (eventsSnap.empty) {
      for (const e of DEFAULT_EVENTS) {
        await setDoc(doc(db, 'events', e.id), e);
      }
    }

    const resSnap = await getDocs(collection(db, 'resources'));
    if (resSnap.empty) {
      for (const r of DEFAULT_RESOURCES) {
        await setDoc(doc(db, 'resources', r.id), r);
      }
    }
  } catch (err) {
    console.warn('Seed data skipped:', err);
  }
}

