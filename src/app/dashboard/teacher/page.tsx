import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { 
  getTeacherSubjectsByTeacher, getClasses, getSubjects, getAcademicPeriods
} from '../../../lib/services/classService';
import { 
  getGradesForClassAndSubject, inputGrade 
} from '../../../lib/services/gradeService';
import { 
  getStudentAttendanceForSession, recordStudentAttendance,
  getStaffAttendanceForDate, recordStaffAttendance, getStaffSelfAttendanceHistory
} from '../../../lib/services/attendanceService';
import { 
  getLessonLogsByTeacher, createLessonLog 
} from '../../../lib/services/ekskulService';
import { 
  Home, Award, CheckSquare, FileText, Plus, ChevronRight, Check, ShieldAlert, Printer, Users, BookOpen
} from 'lucide-react';
import Link from 'next/link';
import { Toast } from '../../../components/ui/Toast';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const metadata = {
  title: 'Guru Dashboard - E-Monitor SD',
};

export default async function TeacherDashboard(props: {
  searchParams: Promise<{ 
    tab?: string; 
    classId?: string; 
    subjectId?: string; 
    periodId?: string; 
    gradeType?: string;
    date?: string;
    attType?: string;
    attSubjectId?: string;
    error?: string; 
    success?: string; 
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const errorMsg = searchParams.error;
  const successMsg = searchParams.success;

  // Selected parameters for Grades tab
  const selClassId = searchParams.classId ? parseInt(searchParams.classId, 10) : null;
  const selSubjectId = searchParams.subjectId ? parseInt(searchParams.subjectId, 10) : null;
  const selPeriodId = searchParams.periodId ? parseInt(searchParams.periodId, 10) : null;
  const selGradeType = (searchParams.gradeType as 'assignment' | 'midterm' | 'final') || 'assignment';

  // Selected parameters for Student Attendance tab
  const selAttDate = searchParams.date || new Date().toISOString().split('T')[0];
  const selAttClassId = searchParams.classId ? parseInt(searchParams.classId, 10) : null;
  const selAttType = (searchParams.attType as 'daily' | 'subject') || 'daily';
  const selAttSubjectId = searchParams.attSubjectId ? parseInt(searchParams.attSubjectId, 10) : null;

  // --- ACTIONS FOR MUTATIONS ---

  async function handleSaveGrades(formData: FormData) {
    'use server';
    const classId = formData.get('classId') as string;
    const subjectId = formData.get('subjectId') as string;
    const periodId = formData.get('periodId') as string;
    const type = formData.get('gradeType') as any;
    
    const studentIds = formData.getAll('student_ids').map(id => parseInt(id as string, 10));

    try {
      for (const studentId of studentIds) {
        const scoreStr = formData.get(`score_${studentId}`) as string;
        if (scoreStr !== '') {
          const score = parseFloat(scoreStr);
          const notes = formData.get(`notes_${studentId}`) as string;
          await inputGrade({
            student_id: studentId,
            subject_id: parseInt(subjectId, 10),
            period_id: parseInt(periodId, 10),
            teacher_id: session!.userId,
            type,
            score,
            notes
          });
        }
      }
      redirect(`/dashboard/teacher?tab=grades&classId=${classId}&subjectId=${subjectId}&periodId=${periodId}&gradeType=${type}&success=Nilai murid berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?tab=grades&classId=${classId}&subjectId=${subjectId}&periodId=${periodId}&gradeType=${type}&error=${encodeURIComponent(err.message || 'Gagal menyimpan nilai')}`);
    }
  }

  async function handleSaveStudentAttendance(formData: FormData) {
    'use server';
    const classId = formData.get('classId') as string;
    const date = formData.get('date') as string;
    const type = formData.get('attType') as any;
    const subjectIdStr = formData.get('attSubjectId') as string;
    const subjectId = subjectIdStr ? parseInt(subjectIdStr, 10) : null;

    const studentIds = formData.getAll('student_ids').map(id => parseInt(id as string, 10));
    const records = studentIds.map(studentId => {
      const status = formData.get(`status_${studentId}`) as any;
      const arrivalTime = formData.get(`arrival_${studentId}`) as string;
      const notes = formData.get(`notes_${studentId}`) as string;
      return { studentId, status, arrivalTime, notes };
    });

    try {
      await recordStudentAttendance(
        parseInt(classId, 10),
        subjectId,
        session!.userId,
        date,
        type,
        records
      );
      redirect(`/dashboard/teacher?tab=attendance&classId=${classId}&date=${date}&attType=${type}&attSubjectId=${subjectIdStr || ''}&success=Absensi murid berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?tab=attendance&classId=${classId}&date=${date}&attType=${type}&attSubjectId=${subjectIdStr || ''}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
    }
  }

  async function handleSaveSelfAttendance(formData: FormData) {
    'use server';
    const date = formData.get('date') as string;
    const status = formData.get('self_status') as any;
    const notes = formData.get('self_notes') as string;

    try {
      await recordStaffAttendance(session!.userId, date, [
        { userId: session!.userId, status, notes }
      ]);
      redirect(`/dashboard/teacher?tab=attendance&date=${date}&success=Kehadiran mandiri berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?tab=attendance&date=${date}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
    }
  }

  async function handleSaveLessonLog(formData: FormData) {
    'use server';
    const classId = parseInt(formData.get('class_id') as string, 10);
    const subjectId = parseInt(formData.get('subject_id') as string, 10);
    const topic = formData.get('topic') as string;
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    const duration = parseInt(formData.get('duration') as string, 10);
    const summary = formData.get('summary') as string;

    try {
      await createLessonLog(session!.userId, subjectId, classId, topic, startTime, endTime, duration, summary);
      redirect('/dashboard/teacher?tab=logs&success=Jurnal mengajar berhasil ditambahkan');
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?tab=logs&error=${encodeURIComponent(err.message || 'Gagal menyimpan jurnal')}`);
    }
  }

  // --- FETCH DATA FOR ACTIVE TAB ---

  const teacherSubjects = await getTeacherSubjectsByTeacher(session.userId);
  const periodsList = await getAcademicPeriods();

  // Helper lists unique to this teacher
  const myClasses = Array.from(new Map(teacherSubjects.map(ts => [ts.class_id, { id: ts.class_id, name: ts.class_name }])).values());
  const mySubjects = Array.from(new Map(teacherSubjects.map(ts => [ts.subject_id, { id: ts.subject_id, name: ts.subject_name }])).values());

  let stats = null;
  let gradeStudents = [];
  let attStudents = [];
  let activePeriod = periodsList.find(p => p.is_active);
  let lessonLogs = [];
  let selfAttendanceHistory = [];
  let selfAttendanceToday = null;

  if (tab === 'overview') {
    const logs = await getLessonLogsByTeacher(session.userId);
    const classesCount = myClasses.length;
    const subjectsCount = mySubjects.length;
    
    stats = {
      classes: classesCount,
      subjects: subjectsCount,
      logs: logs.length
    };
    selfAttendanceHistory = await getStaffSelfAttendanceHistory(session.userId);
  } else if (tab === 'grades') {
    if (selClassId && selSubjectId && selPeriodId) {
      gradeStudents = await getGradesForClassAndSubject(selClassId, selSubjectId, selPeriodId);
    }
  } else if (tab === 'attendance') {
    if (selAttClassId) {
      const attData = await getStudentAttendanceForSession(selAttClassId, selAttDate, selAttType, selAttSubjectId);
      attStudents = attData.records;
    }
    
    // Fetch self daily attendance for selected date
    const staffAtt = await getStaffAttendanceForDate(selAttDate);
    selfAttendanceToday = staffAtt.records.find(r => r.user_id === session.userId);
  } else if (tab === 'logs') {
    lessonLogs = await getLessonLogsByTeacher(session.userId);
  }

  return (
    <div className="flex flex-col gap-6">
      {successMsg && <Toast message={decodeURIComponent(successMsg)} type="success" />}
      {errorMsg && <Toast message={decodeURIComponent(errorMsg)} type="error" />}

      {/* --- OVERVIEW TAB --- */}
      {tab === 'overview' && stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Kelas Diajar</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.classes}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Mata Pelajaran</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.subjects}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Jurnal Mengajar</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.logs}</span>
              </div>
            </div>
          </div>

          {/* Self Attendance History Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Riwayat Kehadiran Harian Anda</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {selfAttendanceHistory.length > 0 ? (
                    selfAttendanceHistory.slice(0, 10).map((h, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-3 font-semibold">{new Date(h.session_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            h.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450' :
                            h.status === 'sick' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450' :
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450'
                          }`}>
                            {h.status === 'present' ? 'Hadir' : h.status === 'sick' ? 'Sakit' : h.status === 'permission' ? 'Izin' : 'Alpa'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-zinc-500">{h.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-zinc-400">Belum ada riwayat kehadiran tercatat</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- GRADES TAB --- */}
      {tab === 'grades' && (
        <div className="flex flex-col gap-6">
          {/* Filters Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Input & Lihat Nilai Murid</h3>
            <form method="GET" action="/dashboard/teacher" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <input type="hidden" name="tab" value="grades" />
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Kelas</label>
                <select name="classId" required defaultValue={selClassId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Kelas --</option>
                  {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Pelajaran</label>
                <select name="subjectId" required defaultValue={selSubjectId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Mapel --</option>
                  {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Tahun Ajaran / Semester</label>
                <select name="periodId" required defaultValue={selPeriodId || activePeriod?.id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {periodsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Jenis Nilai</label>
                <select name="gradeType" required defaultValue={selGradeType} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="assignment">Tugas Harian (LKS / PR)</option>
                  <option value="midterm">UTS (Mid Semester)</option>
                  <option value="final">UAS (Akhir Semester)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">
                  Tampilkan Murid
                </button>
              </div>
            </form>
          </div>

          {/* Grades Input Area */}
          {selClassId && selSubjectId && selPeriodId && (
            <form action={handleSaveGrades}>
              <input type="hidden" name="classId" value={selClassId} />
              <input type="hidden" name="subjectId" value={selSubjectId} />
              <input type="hidden" name="periodId" value={selPeriodId} />
              <input type="hidden" name="gradeType" value={selGradeType} />
              
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-250 dark:border-zinc-800 font-bold text-sm text-zinc-900 dark:text-white uppercase flex items-center justify-between">
                  <span>Input Nilai: {selGradeType === 'assignment' ? 'Tugas' : selGradeType === 'midterm' ? 'UTS' : 'UAS'}</span>
                  <span className="text-zinc-500 font-normal">Tingkat Penilaian: 0 - 100</span>
                </div>
                
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">NIS</th>
                      <th className="px-6 py-4">Nama Lengkap</th>
                      <th className="px-6 py-4 w-32">Nilai Angka</th>
                      <th className="px-6 py-4">Catatan Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {gradeStudents.map((gs) => {
                      const currentScore = selGradeType === 'assignment' ? gs.assignment_score : selGradeType === 'midterm' ? gs.midterm_score : gs.final_score;
                      const currentNotes = selGradeType === 'assignment' ? gs.assignment_notes : selGradeType === 'midterm' ? gs.midterm_notes : gs.final_notes;

                      return (
                        <tr key={gs.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                          <td className="px-6 py-4 font-mono text-xs">{gs.nis}</td>
                          <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                            {gs.student_name}
                            <input type="hidden" name="student_ids" value={gs.student_id} />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="number" 
                              name={`score_${gs.student_id}`}
                              step="0.01"
                              min="0"
                              max="100"
                              defaultValue={currentScore !== null ? currentScore : ''}
                              placeholder="0.0"
                              className="w-full px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input 
                              type="text" 
                              name={`notes_${gs.student_id}`}
                              defaultValue={currentNotes || ''}
                              placeholder="Tugas LKS hal 20, UTS Bab 2, dll."
                              className="w-full px-3 py-1.5 border border-zinc-250 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/15 cursor-pointer">
                  Simpan Perubahan Nilai
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- ATTENDANCE TAB (Mark students in classes AND mark self daily attendance) --- */}
      {tab === 'attendance' && (
        <div className="flex flex-col gap-6">
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Student Attendance Form */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Absensi Kehadiran Murid</h3>
                <form method="GET" action="/dashboard/teacher" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="hidden" name="tab" value="attendance" />
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Kelas</label>
                    <select name="classId" required defaultValue={selAttClassId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                      <option value="">-- Pilih Kelas --</option>
                      {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Tanggal Absensi</label>
                    <input type="date" name="date" required defaultValue={selAttDate} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Jenis Absensi</label>
                    <select name="attType" required defaultValue={selAttType} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                      <option value="daily">Absen Pagi (Harian)</option>
                      <option value="subject">Absen Mata Pelajaran</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Mata Pelajaran (Untuk Absen Mapel)</label>
                    <select name="attSubjectId" defaultValue={selAttSubjectId || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                      <option value="">-- Hanya Untuk Absen Mapel --</option>
                      {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">
                      Pilih dan Muat Absensi
                    </button>
                  </div>
                </form>
              </div>

              {selAttClassId && (
                <form action={handleSaveStudentAttendance}>
                  <input type="hidden" name="classId" value={selAttClassId} />
                  <input type="hidden" name="date" value={selAttDate} />
                  <input type="hidden" name="attType" value={selAttType} />
                  <input type="hidden" name="attSubjectId" value={selAttSubjectId || ''} />

                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-6 py-4">Nama Murid</th>
                          <th className="px-6 py-4">Status Kehadiran</th>
                          <th className="px-6 py-4 w-28">Jam Masuk (Telat)</th>
                          <th className="px-6 py-4">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {attStudents.map((rec) => (
                          <tr key={rec.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                            <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                              {rec.student_name}
                              <input type="hidden" name="student_ids" value={rec.student_id} />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {[
                                  { value: 'present', label: 'Hadir' },
                                  { value: 'sick', label: 'Sakit' },
                                  { value: 'permission', label: 'Izin' },
                                  { value: 'absent', label: 'Alpa' },
                                  { value: 'late', label: 'Telat' }
                                ].map((opt) => (
                                  <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                                    <input 
                                      type="radio" 
                                      name={`status_${rec.student_id}`}
                                      value={opt.value}
                                      defaultChecked={rec.status === opt.value}
                                      className="accent-indigo-600 h-3.5 w-3.5"
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="time" 
                                name={`arrival_${rec.student_id}`}
                                defaultValue={rec.arrival_time || ''}
                                className="w-full px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                name={`notes_${rec.student_id}`}
                                defaultValue={rec.notes || ''}
                                placeholder="Alasan sakit, dll."
                                className="w-full px-2 py-1 border border-zinc-250 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/15 cursor-pointer">
                      Simpan Absensi Murid
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Self Daily Attendance Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 h-fit shadow-xs">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Absensi Mandiri Anda</h3>
              <p className="text-xs text-zinc-400 mb-4">Catat kehadiran Anda sendiri sebagai guru untuk hari yang dipilih.</p>
              
              {/* Date loader GET form */}
              <form method="GET" action="/dashboard/teacher" className="mb-4">
                <input type="hidden" name="tab" value="attendance" />
                <div>
                  <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Pilih Tanggal Kehadiran</label>
                  <div className="flex gap-2">
                    <input type="date" name="date" required defaultValue={selAttDate} className="flex-1 px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                    <button type="submit" className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-xs font-bold cursor-pointer">
                      Muat
                    </button>
                  </div>
                </div>
              </form>

              <form action={handleSaveSelfAttendance} className="flex flex-col gap-4">
                <input type="hidden" name="date" value={selAttDate} />
                <div>
                  <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Status Kehadiran Anda</label>
                  <select name="self_status" required defaultValue={selfAttendanceToday?.status || 'present'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                    <option value="present">Hadir</option>
                    <option value="sick">Sakit</option>
                    <option value="permission">Izin</option>
                    <option value="absent">Alpa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Keterangan / Catatan</label>
                  <textarea name="self_notes" defaultValue={selfAttendanceToday?.notes || ''} placeholder="Tulis alasan jika sakit/izin..." className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs" />
                </div>
                
                <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                  Simpan Absensi Saya
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* --- LESSON LOGS TAB --- */}
      {tab === 'logs' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Jurnal Riwayat Mengajar</h3>
              <Link 
                href={`/dashboard/teacher/print-logs`} 
                target="_blank" 
                className="flex items-center gap-1.5 px-4 py-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak / Download PDF
              </Link>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Materi Pelajaran</th>
                    <th className="px-6 py-4">Pelajaran / Kelas</th>
                    <th className="px-6 py-4">Waktu & Durasi</th>
                    <th className="px-6 py-4">Rangkuman Materi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {lessonLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{log.topic}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold block">{log.subject_name}</span>
                        <span className="text-xs text-zinc-500">Kelas: {log.class_name}</span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className="block font-medium">{log.start_time.slice(0, 5)} - {log.end_time.slice(0, 5)}</span>
                        <span className="text-zinc-500">{log.duration_minutes} Menit</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-500 max-w-xs truncate" title={log.summary}>
                        {log.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Input Jurnal Mengajar</h3>
            <form action={handleSaveLessonLog} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Kelas *</label>
                <select name="class_id" required className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Kelas --</option>
                  {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Mata Pelajaran *</label>
                <select name="subject_id" required className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Mapel --</option>
                  {mySubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Materi yang Dipelajari *</label>
                <input type="text" name="topic" required placeholder="Contoh: Proses Erosi, Perkalian Pecahan" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Jam Mulai *</label>
                  <input type="time" name="start_time" required className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Jam Selesai *</label>
                  <input type="time" name="end_time" required className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Jumlah Jam Belajar (Menit) *</label>
                <input type="number" name="duration" required defaultValue="90" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Rangkuman / Ringkasan Pembelajaran *</label>
                <textarea name="summary" required rows={3} placeholder="Tuliskan rangkuman erosi adalah..." className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs" />
              </div>
              
              <button type="submit" className="mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                Simpan Jurnal Jurnal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
