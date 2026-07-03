'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

interface Subject {
  id: number;
  code: string;
  name: string;
  category: string | null;
  grade_level: string | null;
  is_core: boolean;
  description: string | null;
}

interface SubjectListFilterProps {
  subjects: Subject[];
  handleSubject: any; // server action passed as prop — used by delete form
}

const TYPE_OPTIONS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'academic', label: 'Academic' },
  { value: 'non-academic', label: 'Non-Academic' },
];

export function SubjectListFilter({ subjects, handleSubject }: SubjectListFilterProps) {
  const [filterType, setFilterType] = useState('');
  const [filterName, setFilterName] = useState('');

  // Subjects matching the selected type
  const subjectsByType = useMemo(() => {
    if (!filterType) return subjects;
    return subjects.filter((s) =>
      filterType === 'academic' ? s.is_core : !s.is_core
    );
  }, [subjects, filterType]);

  // Unique subject names for the name dropdown (scoped to selected type)
  const nameOptions = useMemo(() => {
    const seen = new Set<string>();
    return subjectsByType.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [subjectsByType]);

  // Final displayed list
  const displayedSubjects = useMemo(() => {
    if (!filterName) return subjectsByType;
    return subjectsByType.filter((s) => s.name === filterName);
  }, [subjectsByType, filterName]);

  function handleTypeChange(val: string) {
    setFilterType(val);
    // Reset name filter if it no longer belongs to the new type
    if (val && filterName) {
      const stillValid = subjects.some(
        (s) => s.name === filterName && (val === 'academic' ? s.is_core : !s.is_core)
      );
      if (!stillValid) setFilterName('');
    }
  }

  const selectCls =
    'px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white';

  return (
    <div className="flex flex-col gap-4">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-end gap-4">
        {/* Category */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-bold text-zinc-500 uppercase">Kategori</label>
          <select
            value={filterType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className={selectCls}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Name — updates dynamically based on category */}
        <div className="flex flex-col gap-1 min-w-[220px] flex-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Filter Nama</label>
          <select
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className={selectCls}
          >
            <option value="">Semua Nama</option>
            {nameOptions.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {(filterType || filterName) && (
          <button
            type="button"
            onClick={() => { setFilterType(''); setFilterName(''); }}
            className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer"
          >
            Reset Filter
          </button>
        )}

        {/* Count badge */}
        <span className="ml-auto text-xs text-zinc-400 self-end pb-2">
          {displayedSubjects.length} dari {subjects.length} mata pelajaran
        </span>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
          <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-4">Kode</th>
              <th className="px-6 py-4">Nama Pelajaran</th>
              <th className="px-6 py-4">Kategori Mapel</th>
              <th className="px-6 py-4">Jenis</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {displayedSubjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-zinc-400 text-sm">
                  Tidak ada mata pelajaran yang sesuai filter.
                </td>
              </tr>
            ) : (
              displayedSubjects.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-650 dark:text-indigo-400">{s.code}</td>
                  <td className="px-6 py-4 font-medium">{s.name}</td>
                  <td className="px-6 py-4 text-zinc-500">{s.category || '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        s.is_core
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50'
                      }`}
                    >
                      {s.is_core ? 'Academic' : 'Non-Academic'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboard/admin?tab=subjects&editId=${s.id}`}
                        className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg"
                        title="Edit"
                      >
                        {/* Pencil icon via SVG to avoid extra import */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                      {/* Delete — uses a plain form since server actions can't be passed as props to client components */}
                      <form action={handleSubject} className="inline">
                        <input type="hidden" name="actionType" value="delete" />
                        <input type="hidden" name="subjectId" value={s.id} />
                        <button
                          type="submit"
                          className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg cursor-pointer"
                          title="Hapus"
                          onClick={(e) => {
                            if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) e.preventDefault();
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
