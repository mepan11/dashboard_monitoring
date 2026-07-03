import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { getStudentReportCard, getStudentReportCard as getStudentRecap } from '../../../lib/services/gradeService';
import { getStudentAttendanceHistory, getStudentAttendanceSummary } from '../../../lib/services/attendanceService';
import { getStudentEkskulAttendanceHistory } from '../../../lib/services/ekskulService';
import { getAcademicPeriods } from '../../../lib/services/classService';
import { BookOpen, Users, Calendar, Award, CheckSquare } from 'lucide-react';
import { AutoSubmitSelect } from '../../../components/ui/AutoSubmitSelect';

export const metadata = {
  title: 'Wali Murid Dashboard - E-Monitor SD',
};

export default async function ParentDashboard(props: {
  searchParams: Promise<{ tab?: string; periodId?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'parent') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const selPeriodId = searchParams.periodId ? parseInt(searchParams.periodId, 10) : null;

  // 1. Fetch parent child details
  const [parentRows] = await pool.query(
    `SELECT pp.student_id, sp.full_name as student_name, sp.nis, sp.nisn, sp.class_id, c.name as class_name
     FROM parent_profiles pp
     JOIN student_profiles sp ON pp.student_id = sp.id
     JOIN classes c ON sp.class_id = c.id
     WHERE pp.user_id = ?`,
    [session.userId]
  );

  const myChild = (parentRows as any[])[0];

  if (!myChild) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
        Profil anak belum terhubung. Silakan hubungi Super Admin untuk menyambungkan data Anda.
      </div>
    );
  }

  const studentId = myChild.student_id;
  const classId = myChild.class_id;

  // Fetch periods
  const periodsList = await getAcademicPeriods();
  const activePeriod = periodsList.find(p => p.is_active);
  const selectedPeriodId = selPeriodId || activePeriod?.id || (periodsList[0]?.id as number);

  // Fetch student details based on active tab
  let reportCard = [];
  let attendanceHistory = [];
  let attendanceSummary = null;
  let teachersList = [];
  let ekskulAttendance = [];

  if (tab === 'overview' || tab === 'grades') {
    reportCard = await getStudentReportCard(studentId, selectedPeriodId);
  }
  
  if (tab === 'overview' || tab === 'attendance') {
    attendanceHistory = await getStudentAttendanceHistory(studentId);
    attendanceSummary = await getStudentAttendanceSummary(studentId);
    ekskulAttendance = await getStudentEkskulAttendanceHistory(studentId);
  }

  if (tab === 'teachers') {
    // Get teachers and subjects for the child's class
    const [tRows] = await pool.query(
      `SELECT DISTINCT s.code as subject_code, s.name as subject_name, s.category, u.name as teacher_name, u.phone as teacher_phone
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       JOIN users u ON ts.teacher_id = u.id
       WHERE ts.class_id = ?`,
      [classId]
    );
    teachersList = tRows as any[];
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Child Profile Banner Header */}
      <div className="bg-linear-to-r from-indigo-650 to-violet-600 dark:from-indigo-950 dark:to-zinc-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-600/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider">Dashboard Orang Tua / Wali</span>
            <h2 className="text-2xl md:text-3xl font-black mt-1">{myChild.student_name}</h2>
            <p className="text-sm text-indigo-100 font-mono mt-1">NIS: {myChild.nis} | Kelas: {myChild.class_name}</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-semibold border border-white/10">
            <Calendar className="h-4 w-4" />
            <span>Semester: {periodsList.find(p => p.id === selectedPeriodId)?.name || 'Aktif'}</span>
          </div>
        </div>
      </div>

      {/* --- OVERVIEW / GRADES TAB --- */}
      {(tab === 'overview' || tab === 'grades') && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Laporan Nilai Anak</h3>
            
            {/* Period Filter Selector */}
            <form method="GET" action="/dashboard/parent" className="flex items-center gap-2">
              {tab !== 'overview' && <input type="hidden" name="tab" value="grades" />}
              <span className="text-xs font-bold text-zinc-405 dark:text-zinc-500 uppercase">Periode: </span>
              <AutoSubmitSelect
                name="periodId"
                defaultValue={selectedPeriodId}
                options={periodsList.map(p => ({ value: p.id, label: p.name }))}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium"
              />
            </form>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4 text-center">Tugas Harian</th>
                  <th className="px-6 py-4 text-center">Nilai UTS</th>
                  <th className="px-6 py-4 text-center">Nilai UAS</th>
                  <th className="px-6 py-4 text-center font-bold">Nilai Rapor (Weighted)</th>
                  <th className="px-6 py-4">Guru Pengajar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {reportCard.length > 0 ? (
                  reportCard.map((g) => (
                    <tr key={g.subject_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                        {g.subject_name}
                        <span className="text-[10px] text-zinc-400 block font-normal">{g.is_core ? 'Pelajaran Akademik' : 'Muatan Lokal / Ekskul'}</span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">{g.assignment_score || '-'}</td>
                      <td className="px-6 py-4 text-center font-medium">{g.midterm_score || '-'}</td>
                      <td className="px-6 py-4 text-center font-medium">{g.final_score || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-650 dark:text-indigo-400 text-base">{g.final_score_calc || '-'}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium text-xs">{g.teacher_name || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-400 italic">Belum ada nilai terinput untuk periode ini</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ATTENDANCE TAB --- */}
      {tab === 'attendance' && attendanceSummary && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Attendance History */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Log Absensi Kehadiran Anak</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Tipe Absen</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {attendanceHistory.map((h, i) => (
                    <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-3 font-semibold">{new Date(h.session_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                      <td className="px-6 py-3 text-xs uppercase font-bold text-zinc-500">{h.session_type === 'daily' ? 'Harian Pagi' : `Mapel: ${h.subject_name}`}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          h.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450' :
                          h.status === 'sick' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450' :
                          h.status === 'permission' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450' :
                          'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450'
                        }`}>
                          {h.status === 'present' ? 'Hadir' : h.status === 'sick' ? 'Sakit' : h.status === 'permission' ? 'Izin' : h.status === 'late' ? 'Telat' : 'Alpa'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-500">{h.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendance Stats & Extracurricular Attendance */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4">Statistik Kehadiran</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500">Hadir</span>
                  <span className="font-bold text-emerald-600">{attendanceSummary.present} Hari</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500">Sakit</span>
                  <span className="font-bold text-amber-600">{attendanceSummary.sick} Hari</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500">Izin</span>
                  <span className="font-bold text-blue-600">{attendanceSummary.permission} Hari</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-850">
                  <span className="text-zinc-500">Terlambat (Late)</span>
                  <span className="font-bold text-purple-650">{attendanceSummary.late} Hari</span>
                </div>
                <div className="flex justify-between py-2 last:border-0">
                  <span className="text-zinc-500">Alpa / Absen</span>
                  <span className="font-bold text-red-600">{attendanceSummary.absent} Hari</span>
                </div>
              </div>
            </div>

            {/* Extracurricular attendance from Coach */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-3">Kehadiran Kegiatan Ekskul (dari Pelatih)</h3>
              <div className="space-y-3">
                {ekskulAttendance.length > 0 ? (
                  ekskulAttendance.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b last:border-0 last:pb-0 border-zinc-100 dark:border-zinc-800">
                      <div>
                        <span className="font-bold text-zinc-900 dark:text-white block text-sm">{e.extracurricular_name}</span>
                        <span className="text-zinc-400">Pelatih: {e.coach_name} | {new Date(e.session_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 font-bold dark:bg-emerald-950/20 dark:text-emerald-450">{e.status === 'present' ? 'Hadir' : 'Absen'}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400 text-center italic">Tidak ada catatan kehadiran ekskul</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TEACHERS & SUBJECTS TAB --- */}
      {tab === 'teachers' && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Mata Pelajaran & Daftar Guru Mengajar</h3>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
              <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Kode</th>
                  <th className="px-6 py-4">Mata Pelajaran</th>
                  <th className="px-6 py-4">Kategori</th>
                  <th className="px-6 py-4">Nama Guru</th>
                  <th className="px-6 py-4">Kontak Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {teachersList.map((t, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                    <td className="px-6 py-4 font-mono font-bold text-indigo-650 dark:text-indigo-400">{t.subject_code}</td>
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{t.subject_name}</td>
                    <td className="px-6 py-4">{t.category}</td>
                    <td className="px-6 py-4 text-emerald-650 dark:text-emerald-450 font-bold">{t.teacher_name}</td>
                    <td className="px-6 py-4 font-mono text-zinc-500 text-xs">{t.teacher_phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
