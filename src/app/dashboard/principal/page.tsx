import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { getClasses, getStudents, getAcademicPeriods, getSubjects } from '../../../lib/services/classService';
import { getGradesForClassAndSubject, getStudentReportCard, getClassReportCardSummaries } from '../../../lib/services/gradeService';
import { getStudentAttendanceForSession, getStaffAttendanceForDate, getStudentAttendanceSummary } from '../../../lib/services/attendanceService';
import { getStudentEkskulAttendanceHistory } from '../../../lib/services/ekskulService';
import { Users, Award, CheckSquare, Calendar, FileText, Search } from 'lucide-react';

export const metadata = {
  title: 'Principal Dashboard - E-Monitor SD',
};

export default async function PrincipalDashboard(props: {
  searchParams: Promise<{
    tab?: string;
    classId?: string;
    subjectId?: string;
    periodId?: string;
    date?: string;
    studentId?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'principal') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const selClassId = searchParams.classId ? parseInt(searchParams.classId, 10) : null;
  const selSubjectId = searchParams.subjectId ? parseInt(searchParams.subjectId, 10) : null;
  const selPeriodId = searchParams.periodId ? parseInt(searchParams.periodId, 10) : null;
  const selStudentId = searchParams.studentId ? parseInt(searchParams.studentId, 10) : null;
  const selDate = searchParams.date || new Date().toISOString().split('T')[0];

  // Fetch list helpers for selectors
  const classesList = await getClasses();
  const studentsList = await getStudents();
  const periodsList = await getAcademicPeriods();
  const subjectsList = await getSubjects();
  const activePeriod = periodsList.find(p => p.is_active);

  let overviewStats = null;
  let gradesList = [];
  let studentAttendanceList = [];
  let staffAttendanceList = [];
  let reportCardList = [];
  let reportCardStudent = null;
  let reportCardAttendance = null;
  let reportCardEkskul = [];

  if (tab === 'overview') {
    const [cCount] = (await pool.query('SELECT COUNT(*) as count FROM classes')) as any;
    const [sCount] = (await pool.query('SELECT COUNT(*) as count FROM student_profiles')) as any;
    const [tCount] = (await pool.query('SELECT COUNT(*) as count FROM teacher_profiles')) as any;
    const [coCount] = (await pool.query('SELECT COUNT(*) as count FROM coach_profiles')) as any;
    overviewStats = {
      classes: cCount[0].count,
      students: sCount[0].count,
      teachers: tCount[0].count,
      coaches: coCount[0].count,
    };
  } else if (tab === 'grades') {
    if (selClassId && selSubjectId && selPeriodId) {
      gradesList = await getGradesForClassAndSubject(selClassId, selSubjectId, selPeriodId);
    }
  } else if (tab === 'attendance_student') {
    if (selClassId) {
      const attData = await getStudentAttendanceForSession(selClassId, selDate, 'daily', null);
      studentAttendanceList = attData.records;
    }
  } else if (tab === 'attendance_staff') {
    const staffAttData = await getStaffAttendanceForDate(selDate);
    staffAttendanceList = staffAttData.records;
  } else if (tab === 'recap') {
    if (selStudentId && selPeriodId) {
      reportCardStudent = studentsList.find(s => s.id === selStudentId);
      reportCardList = await getStudentReportCard(selStudentId, selPeriodId);
      reportCardAttendance = await getStudentAttendanceSummary(selStudentId);
      reportCardEkskul = await getStudentEkskulAttendanceHistory(selStudentId);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* --- OVERVIEW TAB --- */}
      {tab === 'overview' && overviewStats && (
        <div className="flex flex-col gap-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Jumlah Murid</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewStats.students}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Total Kelas</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewStats.classes}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Staf Guru</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewStats.teachers}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Pelatih Ekskul</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewStats.coaches}</span>
              </div>
            </div>
          </div>

          {/* Quick Recap Class Score Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Ringkasan Rata-Rata Nilai per Kelas (Semester Aktif)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classesList.map(async (c) => {
                const sums = activePeriod ? await getClassReportCardSummaries(c.id, activePeriod.id) : [];
                const classAverage = sums.length > 0 ? (sums.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / sums.length).toFixed(2) : 'N/A';

                return (
                  <div key={c.id} className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-zinc-850 dark:text-zinc-100 block text-base">Kelas {c.name}</span>
                      <span className="text-xs text-zinc-400 block">Wali Kelas: {c.homeroom_teacher_name || 'Belum ditugaskan'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-400 uppercase block">Rata-Rata Kelas</span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{classAverage}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- STUDENT GRADES TAB --- */}
      {tab === 'grades' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Laporan Nilai Akademik Murid</h3>
            <form method="GET" action="/dashboard/principal" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="hidden" name="tab" value="grades" />
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Kelas</label>
                <select name="classId" required defaultValue={selClassId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Kelas --</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Pelajaran</label>
                <select name="subjectId" required defaultValue={selSubjectId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Mapel --</option>
                  {subjectsList.filter(s => s.is_core).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Periode</label>
                <select name="periodId" required defaultValue={selPeriodId || activePeriod?.id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {periodsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">
                  Tampilkan Nilai
                </button>
              </div>
            </form>
          </div>

          {selClassId && selSubjectId && selPeriodId && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">NIS</th>
                    <th className="px-6 py-4">Nama Murid</th>
                    <th className="px-6 py-4 text-center">Tugas Harian</th>
                    <th className="px-6 py-4 text-center">UTS (Midterm)</th>
                    <th className="px-6 py-4 text-center">UAS (Final)</th>
                    <th className="px-6 py-4 text-center">Nilai Rata-rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {gradesList.map((gs) => {
                    const avg = ((gs.assignment_score || 0) * 0.3 + (gs.midterm_score || 0) * 0.3 + (gs.final_score || 0) * 0.4).toFixed(2);
                    return (
                      <tr key={gs.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-mono text-xs">{gs.nis}</td>
                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{gs.student_name}</td>
                        <td className="px-6 py-4 text-center">{gs.assignment_score !== null ? gs.assignment_score : '-'}</td>
                        <td className="px-6 py-4 text-center">{gs.midterm_score !== null ? gs.midterm_score : '-'}</td>
                        <td className="px-6 py-4 text-center">{gs.final_score !== null ? gs.final_score : '-'}</td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">{avg}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- STUDENT ATTENDANCE TAB --- */}
      {tab === 'attendance_student' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Laporan Kehadiran Murid</h3>
              <p className="text-xs text-zinc-400 mt-1">Pantau presensi harian per kelas.</p>
            </div>
            <form method="GET" action="/dashboard/principal" className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="tab" value="attendance_student" />
              <select name="classId" required defaultValue={selClassId || ''} className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                <option value="">-- Pilih Kelas --</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" name="date" required defaultValue={selDate} className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">
                Tampilkan
              </button>
            </form>
          </div>

          {selClassId && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">NIS</th>
                    <th className="px-6 py-4">Nama Murid</th>
                    <th className="px-6 py-4">Status Presensi</th>
                    <th className="px-6 py-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {studentAttendanceList.map((rec) => (
                    <tr key={rec.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-mono text-xs">{rec.nis}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{rec.student_name}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          rec.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450' :
                          rec.status === 'sick' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450' :
                          rec.status === 'permission' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450' :
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450'
                        }`}>
                          {rec.status === 'present' ? 'Hadir' : rec.status === 'sick' ? 'Sakit' : rec.status === 'permission' ? 'Izin' : rec.status === 'late' ? 'Telat' : 'Alpa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{rec.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- STAFF ATTENDANCE TAB --- */}
      {tab === 'attendance_staff' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Presensi Kehadiran Guru & Pelatih</h3>
              <p className="text-xs text-zinc-400 mt-1">Melihat status kehadiran seluruh staf hari ini atau tanggal tertentu.</p>
            </div>
            <form method="GET" action="/dashboard/principal" className="flex items-center gap-2">
              <input type="hidden" name="tab" value="attendance_staff" />
              <input type="date" name="date" required defaultValue={selDate} className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">
                Pilih
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Nama Staf</th>
                  <th className="px-6 py-4">Peran (Role)</th>
                  <th className="px-6 py-4">Status Kehadiran</th>
                  <th className="px-6 py-4">Keterangan / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {staffAttendanceList.map((rec) => (
                  <tr key={rec.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{rec.name}</td>
                    <td className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {rec.role_name === 'teacher' ? 'Guru' : 'Pelatih (Coach)'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        rec.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450' :
                        rec.status === 'sick' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450' :
                        rec.status === 'permission' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450' :
                        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450'
                      }`}>
                        {rec.status === 'present' ? 'Hadir' : rec.status === 'sick' ? 'Sakit' : rec.status === 'permission' ? 'Izin' : 'Alpa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{rec.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SEMESTER RECAP TAB --- */}
      {tab === 'recap' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Rekap Laporan Raport Murid (Akhir Semester)</h3>
            <form method="GET" action="/dashboard/principal" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input type="hidden" name="tab" value="recap" />
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Murid</label>
                <select name="studentId" required defaultValue={selStudentId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Murid --</option>
                  {studentsList.map(s => <option key={s.id} value={s.id}>{s.full_name} (NIS: {s.nis})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Semester</label>
                <select name="periodId" required defaultValue={selPeriodId || activePeriod?.id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {periodsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                  Tampilkan Raport Rekap
                </button>
              </div>
            </form>
          </div>

          {selStudentId && reportCardStudent && reportCardAttendance && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs flex flex-col gap-6">
              
              {/* Raport Header details */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-white">{reportCardStudent.full_name}</h4>
                  <span className="text-xs text-zinc-500 font-mono">NIS: {reportCardStudent.nis} | NISN: {reportCardStudent.nisn || '-'}</span>
                </div>
                <div className="md:text-right">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg block">Kelas {reportCardStudent.class_name}</span>
                  <span className="text-xs text-zinc-500">Tahun Ajaran: {periodsList.find(p => p.id === selPeriodId)?.name}</span>
                </div>
              </div>

              {/* Attendance metrics */}
              <div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white uppercase mb-3 tracking-wide">Ringkasan Kehadiran Murid</h5>
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: 'Hadir', value: reportCardAttendance.present, style: 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50' },
                    { label: 'Sakit', value: reportCardAttendance.sick, style: 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50' },
                    { label: 'Izin', value: reportCardAttendance.permission, style: 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/50' },
                    { label: 'Telat', value: reportCardAttendance.late, style: 'bg-purple-50 border-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/50' },
                    { label: 'Alpa', value: reportCardAttendance.absent, style: 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-450 dark:border-red-900/50' }
                  ].map((stat, i) => (
                    <div key={i} className={`p-3 border rounded-xl text-center font-bold ${stat.style}`}>
                      <span className="text-xs block font-normal uppercase tracking-wider">{stat.label}</span>
                      <span className="text-lg mt-1 block">{stat.value} Hari</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grades tables */}
              <div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white uppercase mb-3 tracking-wide">Hasil Penilaian Akhir</h5>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                    <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-6 py-3">Mata Pelajaran</th>
                        <th className="px-6 py-3 text-center">Tugas</th>
                        <th className="px-6 py-3 text-center">UTS</th>
                        <th className="px-6 py-3 text-center">UAS</th>
                        <th className="px-6 py-3 text-center">Nilai Akhir</th>
                        <th className="px-6 py-3">Guru / Pembina</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {reportCardList.map((g) => (
                        <tr key={g.subject_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                          <td className="px-6 py-3 font-semibold text-zinc-900 dark:text-white">
                            {g.subject_name}
                            <span className="text-[10px] text-zinc-400 block font-normal">{g.is_core ? 'Akademik Inti' : 'Muatan Lokal / Ekskul'}</span>
                          </td>
                          <td className="px-6 py-3 text-center">{g.assignment_score}</td>
                          <td className="px-6 py-3 text-center">{g.midterm_score}</td>
                          <td className="px-6 py-3 text-center">{g.final_score}</td>
                          <td className="px-6 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-base">{g.final_score_calc}</td>
                          <td className="px-6 py-3 text-zinc-500 font-medium text-xs">{g.teacher_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extracurricular logs / activities */}
              <div>
                <h5 className="font-bold text-sm text-zinc-900 dark:text-white uppercase mb-3 tracking-wide">Partisipasi Ekstrakurikuler</h5>
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-150 dark:border-zinc-900 rounded-2xl">
                  {reportCardEkskul.length > 0 ? (
                    <div className="space-y-3">
                      {reportCardEkskul.map((e, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-zinc-200 last:border-0 last:pb-0 dark:border-zinc-800">
                          <div>
                            <span className="font-bold text-zinc-800 dark:text-white block text-sm">{e.extracurricular_name}</span>
                            <span className="text-zinc-400">Pembina: {e.coach_name} | Keterangan: {e.notes || '-'}</span>
                          </div>
                          <div>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold dark:bg-emerald-950/20 dark:text-emerald-450">{e.status === 'present' ? 'Hadir' : 'Izin'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 text-center italic">Tidak ada catatan partisipasi ekstrakurikuler pada semester ini</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
