import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  Building,
  Shield,
  Briefcase,
  Layers,
  Crown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { getAllUsers, getCompanyTeams } from '../../services/db';
import type { UserProfile, CompanyTeam, AllowedPosition } from '../../types';

export const OrganizationChartView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<CompanyTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Grouping Mode: 'byTeam' or 'byHierarchy'
  const [groupMode, setGroupMode] = useState<'byTeam' | 'byHierarchy'>('byTeam');
  const [searchKeyword, setSearchKeyword] = useState('');

  const loadOrgData = async () => {
    setLoading(true);
    try {
      const [uList, tList] = await Promise.all([getAllUsers(), getCompanyTeams()]);
      // Only approved active employees
      const activeUsers = (uList || []).filter((u) => u.status === 'active');
      setUsers(activeUsers);
      setTeams(tList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgData();
  }, []);

  // Strict rank order: 대표 -> 이사 -> 본부장 -> 실장 -> 과장 -> 대리 -> 주임 -> 관리자
  const rankOrder: Record<string, number> = {
    대표: 1,
    대표이사: 1,
    이사: 2,
    본부장: 3,
    총괄본부장: 3,
    관리자: 4,
    실장: 5,
    과장: 6,
    대리: 7,
    주임: 8,
    팀원: 9,
  };

  const getRankWeight = (pos: string) => rankOrder[pos] || 99;

  // Filter users by search
  const filteredUsers = users.filter((u) => {
    if (!searchKeyword.trim()) return true;
    const kw = searchKeyword.toLowerCase();
    const matchName = u.name.toLowerCase().includes(kw);
    const matchTeam = (u.team || u.department || '').toLowerCase().includes(kw);
    const matchPos = (u.position || '').toLowerCase().includes(kw);
    const matchSite = (u.assignedSite || '').toLowerCase().includes(kw);
    return matchName || matchTeam || matchPos || matchSite;
  });

  // Group by Team
  const teamGroups: Record<string, UserProfile[]> = {};
  filteredUsers.forEach((u) => {
    const teamName = u.team || u.department || '미지정팀';
    if (!teamGroups[teamName]) teamGroups[teamName] = [];
    teamGroups[teamName].push(u);
  });

  // Sort within each team by hierarchy
  Object.keys(teamGroups).forEach((t) => {
    teamGroups[t].sort((a, b) => getRankWeight(a.position) - getRankWeight(b.position));
  });

  // Group by Hierarchy
  const hierarchyGroups: { rank: string; list: UserProfile[] }[] = [
    { rank: '임원진 (대표 / 이사 / 본부장)', list: [] },
    { rank: '관리자 / 실장', list: [] },
    { rank: '과장', list: [] },
    { rank: '대리 / 주임', list: [] },
  ];

  filteredUsers.forEach((u) => {
    const pos = u.position || '';
    if (['대표', '대표이사', '이사', '본부장', '총괄본부장'].includes(pos)) {
      hierarchyGroups[0].list.push(u);
    } else if (['관리자', '실장'].includes(pos)) {
      hierarchyGroups[1].list.push(u);
    } else if (pos === '과장') {
      hierarchyGroups[2].list.push(u);
    } else {
      hierarchyGroups[3].list.push(u);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">이도(LEEDO) 사내 조직도</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
              실시간 정규 승인 인원 {users.length}명
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            이도 소속 임직원의 소속 팀, 직급, 담당 분양 현장 및 사내 연락처를 한눈에 확인합니다.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
          <button
            onClick={() => setGroupMode('byTeam')}
            className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
              groupMode === 'byTeam'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            팀별 보기
          </button>
          <button
            onClick={() => setGroupMode('byHierarchy')}
            className={`rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
              groupMode === 'byHierarchy'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            직급 계층별 보기
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="직원 이름, 소속 팀, 직급(대표, 이사, 본부장, 과장 등), 분양 현장 검색"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* By Team Mode */}
      {groupMode === 'byTeam' && (
        <div className="space-y-8">
          {Object.keys(teamGroups).length > 0 ? (
            Object.entries(teamGroups).map(([teamName, members]) => (
              <div key={teamName} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <div className="h-4 w-1.5 rounded-full bg-blue-600"></div>
                  <h3 className="font-bold text-slate-900 text-base">{teamName}</h3>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {members.length}명
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <EmployeeOrgCard key={member.uid} employee={member} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
              검색 조건에 맞는 직원이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* By Hierarchy Mode */}
      {groupMode === 'byHierarchy' && (
        <div className="space-y-8">
          {hierarchyGroups.map((group) => {
            if (group.list.length === 0) return null;
            return (
              <div key={group.rank} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-base">{group.rank}</h3>
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    {group.list.length}명
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.list.map((member) => (
                    <EmployeeOrgCard key={member.uid} employee={member} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface EmployeeOrgCardProps {
  employee: UserProfile;
}

const EmployeeOrgCard: React.FC<EmployeeOrgCardProps> = ({ employee }) => {
  const isExecutive = ['대표', '대표이사', '이사', '본부장'].includes(employee.position || '');

  return (
    <div
      className={`rounded-2xl border p-4.5 transition-all shadow-xs ${
        isExecutive
          ? 'border-amber-300/80 bg-linear-to-b from-amber-50/50 to-white'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl font-black text-sm shadow-xs ${
              isExecutive
                ? 'bg-linear-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300'
                : 'bg-slate-900 text-white'
            }`}
          >
            {employee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm">{employee.name}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-extrabold ${
                  isExecutive
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {employee.position}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {employee.team || employee.department || '영업팀'}
            </div>
          </div>
        </div>

        <span className="font-mono text-[10px] text-slate-400">{employee.employeeNumber}</span>
      </div>

      <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">담당 현장:</span>
          <span className="font-semibold text-slate-800">{employee.assignedSite}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">연락처:</span>
          <a
            href={`tel:${employee.phoneNumber}`}
            className="font-medium text-blue-600 hover:underline flex items-center gap-1"
          >
            <Phone className="h-3 w-3" />
            <span>{employee.phoneNumber}</span>
          </a>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[11px]">이메일:</span>
          <a
            href={`mailto:${employee.email}`}
            className="text-slate-600 hover:text-slate-900 truncate max-w-[170px]"
          >
            {employee.email}
          </a>
        </div>
      </div>
    </div>
  );
};
