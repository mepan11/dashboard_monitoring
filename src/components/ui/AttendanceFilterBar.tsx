'use client';

import { useState } from 'react';

interface StaffOption {
  id: number;
  name: string;
  role_name: 'teacher' | 'coach';
}

interface AttendanceFilterBarProps {
  allStaff: StaffOption[];
  defaultStartDate: string;
  defaultEndDate: string;
  defaultFilterRole: string;
  defaultFilterUserId: number | null;
}

export function AttendanceFilterBar({
  allStaff,
  defaultStartDate,
  defaultEndDate,
  defaultFilterRole,
  defaultFilterUserId,
}: AttendanceFilterBarProps) {
  const [selectedRole, setSelectedRole] = useState(defaultFilterRole);
  const [selectedUserId, setSelectedUserId] = useState(defaultFilterUserId?.toString() ?? '');

  // When the category changes, reset the staff selection and filter the list
  function handleRoleChange(role: string) {
    setSelectedRole(role);
    // Clear user selection if the currently selected user doesn't match the new role
    if (role) {
      const stillValid = allStaff.some(
        (s) => s.id.toString() === selectedUserId && s.role_name === role
      );
      if (!stillValid) setSelectedUserId('');
    }
  }

  const filteredStaff = selectedRole
    ? allStaff.filter((s) => s.role_name === selectedRole)
    : allStaff;

  return (
    <form
      method="GET"
      action="/dashboard/admin"
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs"
    >
      <input type="hidden" name="tab" value="attendance" />
      <div className="flex flex-wrap items-end gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-bold text-zinc-500 uppercase">Tanggal Mulai</label>
          <input
            type="date"
            name="startDate"
            defaultValue={defaultStartDate}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-bold text-zinc-500 uppercase">Tanggal Akhir</label>
          <input
            type="date"
            name="endDate"
            defaultValue={defaultEndDate}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
          />
        </div>

        {/* Category / Role Filter */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label className="text-xs font-bold text-zinc-500 uppercase">Kategori</label>
          <select
            name="filterRole"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
          >
            <option value="">Semua Kategori</option>
            <option value="teacher">Guru</option>
            <option value="coach">Pelatih (Coach)</option>
          </select>
        </div>

        {/* Staff Name Filter — updates dynamically based on selected role */}
        <div className="flex flex-col gap-1 min-w-[200px] flex-1">
          <label className="text-xs font-bold text-zinc-500 uppercase">Filter Nama Staf</label>
          <select
            name="filterUserId"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
          >
            <option value="">Semua Staf</option>
            {filteredStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role_name === 'teacher' ? 'Guru' : 'Pelatih'})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer shadow-sm"
        >
          Terapkan Filter
        </button>
      </div>
    </form>
  );
}
