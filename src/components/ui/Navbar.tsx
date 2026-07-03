"use client";

import React from 'react';

interface NavbarProps {
  title: string;
  userName: string;
  role: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title, userName, role }) => {
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
      case 'super_admin': return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
      case 'principal': return 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'teacher': return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50';
      case 'parent': return 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      case 'coach': return 'bg-pink-50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900/50';
      default: return 'bg-zinc-50 dark:bg-zinc-950/20 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-900/50';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between shadow-xs">
      {/* Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{title}</h1>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {/* Decorative Time badge / Current Day */}
        <div className="hidden md:flex text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 px-3 py-1.5 rounded-lg">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        
        {/* Role label badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 border rounded-full ${getRoleBadgeStyle(role)}`}>
          {getRoleLabel(role)}
        </span>
      </div>
    </header>
  );
};
