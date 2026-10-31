export type UserRole = 'admin' | 'employee';
export type AccountStatus = 'pending' | 'active' | 'rejected' | 'deactivated';

// 직급: 대표, 이사, 본부장, 팀장, 실장, 과장, 대리, 주임, 관리자
export type AllowedPosition =
  | '대표'
  | '이사'
  | '본부장'
  | '팀장'
  | '실장'
  | '과장'
  | '대리'
  | '주임'
  | '관리자';

export interface UserProfile {
  uid: string;
  name: string;
  loginId?: string; // 개인 접속 아이디
  loginPassword?: string; // 개인 접속 비밀번호
  employeeNumber?: string; // 시스템 내부 식별코드
  team: string; // 소속 팀 e.g. 영업1팀, 영업2팀, 분양기획팀
  department?: string; // 하위 호환성 유지
  assignedSite: string; // 담당 분양 현장
  position: AllowedPosition | string; // 직급: 대표, 이사, 본부장, 실장, 과장, 대리, 주임, 관리자
  phoneNumber: string; // 휴대전화 번호
  email: string;
  role: UserRole;
  status: AccountStatus;
  applicationNote?: string; // 등록 신청 시 메모
  rejectReason?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface CompanyTeam {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export type PerformanceType = 'contract' | 'visitor';
export type PerformanceStatus = 'completed' | 'cancelled';
export type VisitorCategory = 'new' | 'revisit';

export interface PerformanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  team: string;
  department?: string; // 호환용
  siteName: string;
  type: PerformanceType;
  date: string; // YYYY-MM-DD
  yearMonth: string; // YYYY-MM
  // Contract specific
  contractIdentifier?: string; // 동·호수 or 계약식별정보
  contractCount?: number;
  // Visitor specific
  visitorCount?: number;
  visitorType?: VisitorCategory; // 신규내방 / 재방문
  funnelSource?: string; // 유입경로 (인터넷/SNS, 전화문의, 현수막/전단, 지인소개, 워크인, 기타)
  
  status: PerformanceStatus;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  memo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PerformanceAuditLog {
  id: string;
  performanceId: string;
  action: 'create' | 'update' | 'cancel' | 'restore';
  performedBy: string;
  performedByName: string;
  details: string;
  timestamp: string;
}

export interface ProjectSite {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'upcoming';
  description?: string;
  createdAt?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InternalEvent {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'upcoming' | 'ongoing' | 'ended';
  howToParticipate: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AwardCriteria = 'contract' | 'visitor' | 'contribution';

export interface EmployeeOfTheMonth {
  id: string;
  yearMonth: string; // YYYY-MM
  employeeId: string;
  employeeName: string;
  team: string;
  department?: string;
  assignedSite: string;
  position?: string;
  criteriaCategory: AwardCriteria;
  reason: string;
  isPublic: boolean;
  awardedBy: string;
  awardedAt: string;
}

// 자료실 첨부파일 상세 정보 (Persistent File Attachment)
export interface ResourceAttachment {
  id: string;
  resourceId: string;
  fileName: string;
  fileSize: string;
  fileSizeBytes: number;
  fileType: string; // 확장자 (pdf, docx, xlsx, hwp 등)
  mimeType: string;
  storagePath?: string;
  totalChunks?: number;
  uploadedAt: string;
  uploadedBy: string;
  uploaderName?: string;
  dataUrl?: string;
}

// 자료실 (Resources / Reference Board)
export interface ResourceItem {
  id: string;
  title: string;
  category: string; // 분양 브로슈어, 계약서 양식, 분양공고문, 세무/법률 가이드, 사업지 분석자료, 기타 서식
  description: string;
  fileName?: string; // 하위 호환성 유지
  fileSize?: string;
  fileUrl?: string;
  attachments?: ResourceAttachment[]; // 다중 첨부파일 지원
  authorId: string;
  authorName: string;
  authorTeam: string;
  authorPosition: string;
  createdAt: string;
  updatedAt?: string;
  downloadCount: number;
}

// 개인일정표 (Personal Calendar Schedule)
export interface PersonalSchedule {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  title: string;
  category: '고객상담' | '내방예약' | '계약체결' | '납부안내' | '외근/업무' | '기타';
  location?: string;
  memo?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MonthlyStats {
  yearMonth: string;
  totalContracts: number;
  validContracts: number;
  cancelledContracts: number;
  totalVisitors: number;
  newVisitors: number;
  revisitVisitors: number;
}

// 사내 알림 (App Notifications - 사내자료실, 사내 공지사항, 프로모션&이벤트, 이달의 우수직원)
export type NotificationCategory = 'resource' | 'notice' | 'event' | 'star';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  categoryLabel: string; // '사내자료실' | '사내 공지' | '프로모션&이벤트' | '이달의 우수직원'
  title: string;
  message: string;
  targetMenu: string; // 'resources' | 'notices' | 'events' | 'employee_of_the_month'
  targetId: string;
  createdAt: string; // ISO string
  authorName?: string;
  isImportant?: boolean;
  itemData?: Notice | ResourceItem | InternalEvent | EmployeeOfTheMonth;
}
