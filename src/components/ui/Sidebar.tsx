"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Home, BookOpen, Users, Calendar, Award, 
  FileText, CheckSquare, Settings, LogOut, Menu, X, BookOpenCheck
} from 'lucide-react';

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
}

interface SidebarProps {
  role: string;
  userName: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, userName, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  const getLinks = (userRole: string): SidebarLink[] => {
    switch (userRole) {
      case 'super_admin':
        return [
          { label: 'Dashboard', href: '/dashboard/admin', icon: Home },
          { label: 'Classes', href: '/dashboard/admin?tab=classes', icon: Users },
          { label: 'Subjects', href: '/dashboard/admin?tab=subjects', icon: BookOpen },
          { label: 'Academic Periods', href: '/dashboard/admin?tab=periods', icon: Calendar },
          { label: 'Extracurriculars', href: '/dashboard/admin?tab=ekskuls', icon: Award },
          { label: 'Student Profiles', href: '/dashboard/admin?tab=students', icon: Users },
          { label: 'Staff Accounts', href: '/dashboard/admin?tab=staff', icon: Settings },
          { label: 'Staff Attendance', href: '/dashboard/admin?tab=attendance', icon: CheckSquare },
        ];
      case 'teacher':
        return [
          { label: 'Dashboard', href: '/dashboard/teacher', icon: Home },
          { label: 'Student Grades', href: '/dashboard/teacher?tab=grades', icon: Award },
          { label: 'Attendances', href: '/dashboard/teacher?tab=attendance', icon: CheckSquare },
          { label: 'Lesson Logs (Journal)', href: '/dashboard/teacher?tab=logs', icon: FileText },
        ];
      case 'principal':
        return [
          { label: 'Dashboard', href: '/dashboard/principal', icon: Home },
          { label: 'Student Grades', href: '/dashboard/principal?tab=grades', icon: Award },
          { label: 'Student Attendance', href: '/dashboard/principal?tab=attendance_student', icon: CheckSquare },
          { label: 'Staff Attendance', href: '/dashboard/principal?tab=attendance_staff', icon: Calendar },
          { label: 'Semester Recap', href: '/dashboard/principal?tab=recap', icon: FileText },
        ];
      case 'parent':
        return [
          { label: 'Dashboard', href: '/dashboard/parent', icon: Home },
          { label: 'Report Card (Grades)', href: '/dashboard/parent?tab=grades', icon: Award },
          { label: 'Attendance Records', href: '/dashboard/parent?tab=attendance', icon: CheckSquare },
          { label: 'Teachers & Subjects', href: '/dashboard/parent?tab=teachers', icon: BookOpenCheck },
        ];
      case 'coach':
        return [
          { label: 'Dashboard', href: '/dashboard/coach', icon: Home },
          { label: 'Ekskul Attendance', href: '/dashboard/coach?tab=attendance', icon: CheckSquare },
          { label: 'Activity Logs', href: '/dashboard/coach?tab=logs', icon: FileText },
        ];
      default:
        return [];
    }
  };

  const links = getLinks(role);

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'super_admin': return 'Super Admin';
      case 'principal': return 'Kepala Sekolah';
      case 'teacher': return 'Guru';
      case 'parent': return 'Wali Murid';
      case 'coach': return 'Pelatih Ekskul';
      default: return 'User';
    }
  };

  const getRoleBadgeStyle = (r: string) => {
    switch (r) {
      case 'super_admin': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'principal': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'teacher': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'parent': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'coach': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <>
      {/* Mobile Toggle Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-zinc-950 text-white border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-indigo-500" />
          <span className="font-bold tracking-tight text-lg">Sistem Monitoring SD</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-lg hover:bg-zinc-800 transition-colors">
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Shell */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-zinc-950 text-zinc-400 border-r border-zinc-900 flex flex-col justify-between transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand / Logo */}
        <div>
          <div className="hidden lg:flex items-center gap-2 p-6 border-b border-zinc-900">
            <BookOpen className="h-8 w-8 text-indigo-500" />
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight leading-tight">Monitoring</span>
              <span className="text-xs text-zinc-500">Sekolah Dasar</span>
            </div>
          </div>

          {/* User Profile Mini Panel */}
          <div className="p-6 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-indigo-600/20">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-white font-medium truncate text-sm">{userName}</span>
                <span className={`inline-block w-fit text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 mt-1 border rounded-full ${getRoleBadgeStyle(role)}`}>
                  {getRoleLabel(role)}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {links.map((link) => {
              const Icon = link.icon;
              // Check if tab matches the URL query or path
              const isActive = activeTab 
                ? link.href === `${pathname}?tab=${activeTab}`
                : link.href === pathname;

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                      : 'hover:bg-zinc-900 hover:text-zinc-100'}
                  `}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-zinc-900">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
        />
      )}
    </>
  );
};
