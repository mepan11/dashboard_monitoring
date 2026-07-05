import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { 
  Home, Award, CheckSquare, Settings, HelpCircle, Users, BookOpen, 
  Clock, ChevronRight, Plus, Mail, Megaphone, UserPlus, Info, 
  Check, Bell, Search, Calendar, FileWarning, ArrowLeft, Download, Printer
} from 'lucide-react';
import Link from 'next/link';
import { Toast } from '../../../components/ui/Toast';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const metadata = {
  title: 'Teacher Dashboard - EduPulse Primary',
};

export default async function TeacherDashboard(props: {
  searchParams: Promise<{ 
    tab?: string; 
    error?: string; 
    success?: string;
    newAnnouncement?: string;
    message?: string;
    addStudent?: string;
    subTab?: string;
    classId?: string;
    subjectId?: string;
    date?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const subTab = searchParams.subTab || (tab === 'attendance' ? 'entry' : tab === 'classes' ? 'teaching' : '');
  const classIdParam = searchParams.classId ? parseInt(searchParams.classId, 10) : null;
  const subjectIdParam = searchParams.subjectId ? parseInt(searchParams.subjectId, 10) : null;
  const dateParam = searchParams.date || new Date().toISOString().split('T')[0];
  const errorMsg = searchParams.error;
  const successMsg = searchParams.success;
  const showNewAnnouncement = searchParams.newAnnouncement === 'true';
  const showMessageModal = searchParams.message === 'true';
  const showAddStudentModal = searchParams.addStudent === 'true';

  // --- SERVER ACTION: CREATE ANNOUNCEMENT ---
  async function handleCreateAnnouncement(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    try {
      await pool.query(
        'INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)',
        [title, content, session!.userId]
      );
      
      // Log activity
      await pool.query(
        'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
        [session!.userId, session!.name, `Membuat pengumuman baru: ${title}`, 'Sistem']
      );

      redirect('/dashboard/teacher?success=Pengumuman berhasil disebarkan');
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?error=${encodeURIComponent(err.message || 'Gagal menyebarkan pengumuman')}`);
    }
  }

  // --- SERVER ACTION: MOCK SEND MESSAGE ---
  async function handleSendMessage(formData: FormData) {
    'use server';
    const recipient = formData.get('recipient') as string;
    const message = formData.get('message') as string;

    try {
      // Log activity
      await pool.query(
        'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
        [session!.userId, session!.name, `Mengirim pesan ke: ${recipient}`, 'Sistem']
      );

      redirect('/dashboard/teacher?success=Pesan berhasil dikirim');
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?error=${encodeURIComponent(err.message || 'Gagal mengirim pesan')}`);
    }
  }

  // --- SERVER ACTION: MOCK ADD STUDENT ---
  async function handleAddStudent(formData: FormData) {
    'use server';
    const fullName = formData.get('full_name') as string;
    const nis = formData.get('nis') as string;
    const nisn = formData.get('nisn') as string;
    const classIdStr = formData.get('classId') as string;
    const classId = classIdStr ? parseInt(classIdStr, 10) : null;
    const isFromClasses = formData.get('isFromClasses') === 'true';

    try {
      await pool.query(
        'INSERT INTO student_profiles (nis, nisn, full_name, class_id, is_active) VALUES (?, ?, ?, ?, 1)',
        [nis, nisn, fullName, classId]
      );

      // Log activity
      await pool.query(
        'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
        [session!.userId, session!.name, `Menambahkan siswa baru: ${fullName}`, 'Sistem']
      );

      if (isFromClasses) {
        redirect('/dashboard/teacher?tab=classes&subTab=homeroom&success=Siswa baru berhasil ditambahkan');
      } else {
        redirect('/dashboard/teacher?success=Siswa baru berhasil didaftarkan');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      if (isFromClasses) {
        redirect(`/dashboard/teacher?tab=classes&subTab=homeroom&error=${encodeURIComponent(err.message || 'Gagal mendaftarkan siswa')}`);
      } else {
        redirect(`/dashboard/teacher?error=${encodeURIComponent(err.message || 'Gagal mendaftarkan siswa')}`);
      }
    }
  }

  // --- SERVER ACTION: SAVE ATTENDANCE ---
  async function handleSaveAttendance(formData: FormData) {
    'use server';
    const cIdStr = formData.get('classId') as string;
    const sIdStr = formData.get('subjectId') as string;
    const sDate = formData.get('sessionDate') as string;
    const subTabTarget = formData.get('subTab') as string || 'entry';

    const cId = cIdStr ? parseInt(cIdStr, 10) : null;
    const sId = sIdStr && sIdStr !== 'daily' ? parseInt(sIdStr, 10) : null;

    if (!cId || !sDate) {
      redirect(`/dashboard/teacher?tab=attendance&subTab=${subTabTarget}&error=Data kelas dan tanggal tidak lengkap`);
    }

    try {
      // Find or create attendance session
      const [sessions] = await pool.query(
        'SELECT id FROM attendance_sessions WHERE class_id = ? AND (subject_id = ? OR (subject_id IS NULL AND ? IS NULL)) AND session_date = ? LIMIT 1',
        [cId, sId, sId, sDate]
      ) as any[];

      let sessionId;
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        const sessionType = sId ? 'subject' : 'daily';
        const [insertRes] = await pool.query(
          'INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, session_date, session_type) VALUES (?, ?, ?, ?, ?)',
          [cId, sId, session!.userId, sDate, sessionType]
        ) as any[];
        sessionId = insertRes.insertId;
      }

      // Get all students of this class to save their records
      const [classStudents] = await pool.query(
        'SELECT id FROM student_profiles WHERE class_id = ?',
        [cId]
      ) as any[];

      for (const student of classStudents) {
        const status = formData.get(`studentStatus_${student.id}`) as string || 'present';
        const notes = formData.get(`notes_${student.id}`) as string || null;

        const [records] = await pool.query(
          'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ? LIMIT 1',
          [sessionId, student.id]
        ) as any[];

        if (records.length > 0) {
          await pool.query(
            'UPDATE attendance_records SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
            [status, notes, records[0].id]
          );
        } else {
          await pool.query(
            'INSERT INTO attendance_records (session_id, student_id, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?)',
            [sessionId, student.id, status, notes, session!.userId]
          );
        }
      }

      // Log activity
      const [classInfo] = await pool.query('SELECT name FROM classes WHERE id = ?', [cId]) as any[];
      const className = classInfo.length > 0 ? classInfo[0].name : '';
      await pool.query(
        'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
        [session!.userId, session!.name, `Menyimpan absensi kelas ${className} tanggal ${sDate}`, 'Sistem']
      );

      redirect(`/dashboard/teacher?tab=attendance&subTab=${subTabTarget}&classId=${cId}&subjectId=${sIdStr || 'daily'}&date=${sDate}&success=Absensi berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/teacher?tab=attendance&subTab=${subTabTarget}&classId=${cId}&subjectId=${sIdStr || 'daily'}&date=${sDate}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
    }
  }

  // --- FETCH DYNAMIC TEACHER DATA ---
  // 1. Check if teacher is a homeroom teacher
  const [homeroomRows] = await pool.query(
    'SELECT * FROM classes WHERE homeroom_teacher_id = ? LIMIT 1', 
    [session.userId]
  ) as any[];
  const myHomeroomClass = homeroomRows.length > 0 ? homeroomRows[0] : null;

  // 2. Fetch today's class schedules (fallback to Monday if weekend)
  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayDayName = daysIndo[new Date().getDay()];
  const queryDay = (todayDayName === 'Sabtu' || todayDayName === 'Minggu') ? 'Senin' : todayDayName;

  const [schedules] = await pool.query(`
    SELECT cs.*, s.name as subject_name, s.code as subject_code, c.name as class_name,
           (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id) as student_count
    FROM class_schedules cs
    JOIN subjects s ON cs.subject_id = s.id
    JOIN classes c ON cs.class_id = c.id
    WHERE cs.teacher_id = ? AND cs.day_name = ?
    ORDER BY cs.start_time ASC
  `, [session.userId, queryDay]) as any[];

  // 3. Fetch detailed data for Classes Tab (teaching roster and homeroom)
  let teachingRoster: any[] = [];
  let homeroomStudents: any[] = [];
  let homeroomSchedules: any[] = [];
  let cleaningSchedule: { [key: string]: string[] } = {
    Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: []
  };
  let totalStudentsTaught = 0;
  
  if (tab === 'classes') {
    // Taught roster
    const [rosterRows] = await pool.query(`
      SELECT DISTINCT cs.class_id, cs.subject_id, c.name as class_name, c.grade_level, s.name as subject_name, s.code as subject_code,
             (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id) as student_count
      FROM class_schedules cs
      JOIN classes c ON cs.class_id = c.id
      JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.teacher_id = ?
      ORDER BY c.grade_level ASC, c.name ASC
    `, [session.userId]) as any[];
    teachingRoster = rosterRows;
    totalStudentsTaught = teachingRoster.reduce((sum, r) => sum + (r.student_count || 0), 0);

    // Homeroom details if applicable
    if (myHomeroomClass) {
      const [studRows] = await pool.query(`
        SELECT id, nis, nisn, full_name, gender, is_active 
        FROM student_profiles 
        WHERE class_id = ? 
        ORDER BY full_name ASC
      `, [myHomeroomClass.id]) as any[];
      homeroomStudents = studRows;

      // Group cleaning schedule
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      homeroomStudents.forEach((stud, idx) => {
        const day = days[idx % 5];
        const parts = stud.full_name.split(' ');
        const shortName = parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
        cleaningSchedule[day].push(shortName);
      });

      // Homeroom class schedules
      const [schedRows] = await pool.query(`
        SELECT cs.*, s.name as subject_name, s.code as subject_code, u.name as teacher_name
        FROM class_schedules cs
        JOIN subjects s ON cs.subject_id = s.id
        JOIN users u ON cs.teacher_id = u.id
        WHERE cs.class_id = ?
        ORDER BY FIELD(cs.day_name, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'), cs.start_time ASC
      `, [myHomeroomClass.id]) as any[];
      homeroomSchedules = schedRows;
    }
  }

  // 4. Fetch detailed data for Attendance Tab (taught classes, students, records, recap)
  let classesTaught: any[] = [];
  let subjectsTaught: any[] = [];
  let activeClass = null;
  let activeClassId: number | null = null;
  let activeSubject = null;
  let attendanceStudents: any[] = [];
  let attendanceRecordsMap: { [key: number]: { status: string, notes: string | null } } = {};
  
  let todayPresentCount = 0;
  let todayAbsentCount = 0;
  let todayLateCount = 0;
  let todaySickCount = 0;

  let recapSessions: any[] = [];
  let recapRecordsMap: { [key: string]: { [key: number]: string } } = {}; // dateStr -> { studentId -> status }

  if (tab === 'attendance') {
    const [cRows] = await pool.query(`
      SELECT DISTINCT c.id, c.name, c.grade_level
      FROM classes c
      LEFT JOIN class_schedules cs ON cs.class_id = c.id
      WHERE cs.teacher_id = ? OR c.homeroom_teacher_id = ?
      ORDER BY c.grade_level ASC, c.name ASC
    `, [session.userId, session.userId]) as any[];
    classesTaught = cRows;

    activeClassId = classIdParam || myHomeroomClass?.id || (classesTaught.length > 0 ? classesTaught[0].id : null);

    if (activeClassId) {
      const [classDetails] = await pool.query('SELECT * FROM classes WHERE id = ?', [activeClassId]) as any[];
      activeClass = classDetails.length > 0 ? classDetails[0] : null;

      const [sRows] = await pool.query(`
        SELECT DISTINCT s.id, s.name, s.code
        FROM class_schedules cs
        JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.class_id = ? AND cs.teacher_id = ?
      `, [activeClassId, session.userId]) as any[];
      subjectsTaught = sRows;

      const [studRows] = await pool.query(`
        SELECT id, nis, nisn, full_name, gender 
        FROM student_profiles 
        WHERE class_id = ? 
        ORDER BY full_name ASC
      `, [activeClassId]) as any[];
      attendanceStudents = studRows;

      const activeSubjectId = subjectIdParam || (subjectsTaught.length > 0 ? subjectsTaught[0].id : 'daily');
      const sIdVal = activeSubjectId && activeSubjectId !== 'daily' ? activeSubjectId : null;

      if (sIdVal) {
        const [subDetails] = await pool.query('SELECT * FROM subjects WHERE id = ?', [sIdVal]) as any[];
        activeSubject = subDetails.length > 0 ? subDetails[0] : null;
      }

      // Load today's records
      const [existingSession] = await pool.query(`
        SELECT id FROM attendance_sessions 
        WHERE class_id = ? AND (subject_id = ? OR (subject_id IS NULL AND ? IS NULL)) AND session_date = ?
        LIMIT 1
      `, [activeClassId, sIdVal, sIdVal, dateParam]) as any[];

      if (existingSession.length > 0) {
        const [records] = await pool.query(`
          SELECT student_id, status, notes 
          FROM attendance_records 
          WHERE session_id = ?
        `, [existingSession[0].id]) as any[];

        records.forEach((rec: any) => {
          attendanceRecordsMap[rec.student_id] = {
            status: rec.status,
            notes: rec.notes
          };
          if (rec.status === 'present') todayPresentCount++;
          else if (rec.status === 'absent') todayAbsentCount++;
          else if (rec.status === 'late') todayLateCount++;
          else if (rec.status === 'sick' || rec.status === 'permission') todaySickCount++;
        });
      } else {
        // Default present count if no records recorded yet
        todayPresentCount = attendanceStudents.length;
      }

      // If recap tab, load monthly recap data
      if (subTab === 'recap') {
        const currentMonthStr = dateParam.slice(0, 7); // e.g. "2026-07"
        const startOfMonth = `${currentMonthStr}-01`;
        const endOfMonth = `${currentMonthStr}-31`;

        const [sessRows] = await pool.query(`
          SELECT id, session_date, session_type
          FROM attendance_sessions
          WHERE class_id = ? AND session_date BETWEEN ? AND ?
          ORDER BY session_date ASC
        `, [activeClassId, startOfMonth, endOfMonth]) as any[];
        recapSessions = sessRows;

        if (recapSessions.length > 0) {
          const sessionIds = recapSessions.map(s => s.id);
          const [recRows] = await pool.query(`
            SELECT ar.session_id, ar.student_id, ar.status, s.session_date
            FROM attendance_records ar
            JOIN attendance_sessions s ON ar.session_id = s.id
            WHERE ar.session_id IN (?)
          `, [sessionIds]) as any[];

          recRows.forEach((rec: any) => {
            const dateStr = rec.session_date.toISOString().split('T')[0];
            if (!recapRecordsMap[dateStr]) {
              recapRecordsMap[dateStr] = {};
            }
            recapRecordsMap[dateStr][rec.student_id] = rec.status;
          });
        }
      }
    }
  }

  // Helper to convert grade level to ordinal
  const getOrdinalGrade = (g: number) => {
    const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
    return ord[g - 1] || g + 'th';
  };

  // Helper to resolve classroom room number/name
  const getRoom = (className: string, subjectName: string) => {
    const sName = subjectName.toLowerCase();
    if (sName.includes('sbdp') || sName.includes('art') || sName.includes('s seni')) {
      return 'Art Studio';
    }
    if (sName.includes('ipa') || sName.includes('science')) {
      return 'Science Lab';
    }
    if (className.includes('1') || className.includes('2')) {
      return 'Room 102';
    }
    if (className.includes('3') || className.includes('4')) {
      return 'Room 204';
    }
    return 'Room 305';
  };

  return (
    <div className="min-h-screen bg-zinc-550/5 dark:bg-zinc-950 p-6 flex flex-col gap-6">
      {successMsg && <Toast message={decodeURIComponent(successMsg)} type="success" />}
      {errorMsg && <Toast message={decodeURIComponent(errorMsg)} type="error" />}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search students..." 
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-850 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 rounded-xl relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" />
          </button>
          <button className="p-2 border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 rounded-xl">
            <Calendar className="h-4 w-4" />
          </button>
          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono">
            {session.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* --- OVERVIEW / MAIN DASHBOARD TAB --- */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main Left Columns (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Blue Welcome Banner */}
            <div className="bg-blue-600 dark:bg-blue-700 text-white p-8 rounded-3xl shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-radial-gradient from-white to-transparent pointer-events-none" />
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  Welcome back, {session.name}
                </h2>
                <p className="text-xs text-blue-100 max-w-xl font-medium">
                  {myHomeroomClass 
                    ? `Your ${getOrdinalGrade(myHomeroomClass.grade_level)} class is waiting for you! You have ${schedules.length} classes scheduled for today.` 
                    : `You have ${schedules.length} classes scheduled for today.`
                  }
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/dashboard/teacher?newAnnouncement=true"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  New Announcement
                </Link>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-xs font-bold transition-colors border border-blue-400"
                >
                  View Monthly Report
                </button>
              </div>
            </div>

            {/* Today's Schedule Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">Today's Schedule</h3>
                <span className="text-xs text-blue-650 dark:text-blue-450 font-bold hover:underline cursor-pointer">
                  Full Calendar
                </span>
              </div>

              <div className="space-y-3">
                {schedules.length > 0 ? (
                  schedules.map((sch: any) => {
                    const room = getRoom(sch.class_name, sch.subject_name);
                    return (
                      <div 
                        key={sch.id} 
                        className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-950/45 hover:bg-zinc-50 dark:hover:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-6">
                          <div className="text-center shrink-0 border-r border-zinc-200 dark:border-zinc-800 pr-6">
                            <span className="text-[11px] font-black text-zinc-900 dark:text-white block">
                              {sch.start_time.slice(0, 5)}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                              {sch.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                              {sch.subject_name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">
                              Class {sch.class_name.replace(/(\d+)([A-Z]+)/, '$1-$2')} &bull; {room}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="h-6 min-w-6 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-[10px] font-black rounded-full flex items-center justify-center">
                            {sch.student_count || 28}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 bg-zinc-50 dark:bg-zinc-950 rounded-2xl text-center text-xs text-zinc-400 italic">
                    No classes scheduled for today. Take rest!
                  </div>
                )}
              </div>
            </div>

            {/* Stats Summary Panel */}
            <div className="grid sm:grid-cols-2 gap-6">
              
              {/* Stat 1: Today Attendance Rate */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    ~+2.4%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Today's Attendance Rate</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white leading-tight block mt-1">98.2%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98.2%' }} />
                </div>
              </div>

              {/* Stat 2: Pending Grades */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
                    <FileWarning className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Pending Grades</span>
                  <span className="text-2xl font-black text-zinc-900 dark:text-white leading-tight block mt-1">12</span>
                  <span className="text-[10px] text-zinc-400 block mt-2 font-medium">Next deadline: Friday, 4:00 PM</span>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column (1 col) */}
          <div className="space-y-6">
            
            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Quick Actions</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/dashboard/teacher?tab=attendance"
                  className="bg-zinc-550/5 hover:bg-zinc-100/50 dark:bg-zinc-950/30 dark:hover:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-455 rounded-xl group-hover:scale-110 transition-transform">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300">Mark Attend</span>
                </Link>

                <Link
                  href="/dashboard/teacher?newAnnouncement=true"
                  className="bg-zinc-550/5 hover:bg-zinc-100/50 dark:bg-zinc-950/30 dark:hover:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="p-2.5 bg-purple-500/10 text-purple-650 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300">Broadcast</span>
                </Link>

                <Link
                  href="/dashboard/teacher?message=true"
                  className="bg-zinc-550/5 hover:bg-zinc-100/50 dark:bg-zinc-950/30 dark:hover:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-455 rounded-xl group-hover:scale-110 transition-transform">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300">Message</span>
                </Link>

                <Link
                  href="/dashboard/teacher?addStudent=true"
                  className="bg-zinc-550/5 hover:bg-zinc-100/50 dark:bg-zinc-950/30 dark:hover:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all group"
                >
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 rounded-xl group-hover:scale-110 transition-transform">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-zinc-700 dark:text-zinc-300">Add Student</span>
                </Link>
              </div>
            </div>

            {/* School News Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">School News</h3>
              </div>

              <div className="space-y-4 border-l border-zinc-200 dark:border-zinc-800 pl-4 ml-2 relative">
                
                {/* News 1 */}
                <div className="space-y-1 relative">
                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900" />
                  <span className="text-[9px] font-bold text-zinc-400 block uppercase">Today, 09:15</span>
                  <h4 className="text-xs font-black text-zinc-850 dark:text-white">Inter-School Sports Day</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Registration for the annual sports meet is now open for all grade students.
                  </p>
                </div>

                {/* News 2 */}
                <div className="space-y-1 relative">
                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 bg-purple-500 rounded-full border-2 border-white dark:border-zinc-900" />
                  <span className="text-[9px] font-bold text-zinc-400 block uppercase">Yesterday</span>
                  <h4 className="text-xs font-black text-zinc-850 dark:text-white">Library Renovation</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    The East Wing library will be closed for painting until next Monday morning.
                  </p>
                </div>

                {/* News 3 */}
                <div className="space-y-1 relative">
                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 bg-amber-500 rounded-full border-2 border-white dark:border-zinc-900" />
                  <span className="text-[9px] font-bold text-zinc-400 block uppercase">2 days ago</span>
                  <h4 className="text-xs font-black text-zinc-850 dark:text-white">New Curriculum Update</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Please review the updated Math syllabus for the next academic period.
                  </p>
                </div>

              </div>

              <button className="w-full py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-all">
                View All News
              </button>
            </div>

          </div>

        </div>
      )}

      {/* --- MY CLASSES TAB --- */}
      {tab === 'classes' && (
        <div className="flex flex-col gap-6">
          
          {/* Sub Tab Navigation Banner */}
          <div className="flex flex-col gap-2">
            {subTab === 'homeroom' && myHomeroomClass && (
              <div className="mb-2">
                <span className="text-[10px] font-bold text-blue-650 dark:text-blue-450 uppercase tracking-widest block">Class Management</span>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">
                  Class {myHomeroomClass.name.replace(/(\d+)([A-Z]+)/, '$1-$2')} — Lumina Building, {getRoom(myHomeroomClass.name, 'Math')}
                </h2>
              </div>
            )}
            
            <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <Link
                href={`/dashboard/teacher?tab=classes&subTab=teaching`}
                className={`text-xs font-bold transition-colors pb-2 -mb-[13px] border-b-2 ${
                  subTab === 'teaching'
                    ? 'border-blue-600 text-zinc-900 dark:text-white'
                    : 'border-transparent text-zinc-450 hover:text-zinc-700'
                }`}
              >
                Guru Mengajar
              </Link>
              <Link
                href={`/dashboard/teacher?tab=classes&subTab=homeroom`}
                className={`text-xs font-bold transition-colors pb-2 -mb-[13px] border-b-2 ${
                  subTab === 'homeroom'
                    ? 'border-blue-600 text-zinc-900 dark:text-white'
                    : 'border-transparent text-zinc-450 hover:text-zinc-700'
                }`}
              >
                Wali Kelas
              </Link>
              <Link
                href={`/dashboard/teacher?tab=classes&subTab=report`}
                className={`text-xs font-bold transition-colors pb-2 -mb-[13px] border-b-2 ${
                  subTab === 'report'
                    ? 'border-blue-600 text-zinc-900 dark:text-white'
                    : 'border-transparent text-zinc-450 hover:text-zinc-700'
                }`}
              >
                Report Center
              </Link>
            </div>
          </div>

          {/* SUBTAB 1: GURU MENGAJAR */}
          {subTab === 'teaching' && (
            <div className="space-y-6">
              
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-3 gap-6">
                {/* Stat 1: Total Students */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-450 rounded-xl">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Total Students</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white block">{totalStudentsTaught}</span>
                    <span className="text-[10px] text-emerald-600 font-bold block mt-1">Active Today</span>
                  </div>
                </div>

                {/* Stat 2: Teaching Hours */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-450 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Teaching Hours</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white block">
                      {teachingRoster.length * 4} <span className="text-xs font-normal text-zinc-400">/ week</span>
                    </span>
                    <span className="text-[10px] text-blue-600 font-bold block mt-1">Next Class in 15m</span>
                  </div>
                </div>

                {/* Stat 3: Curriculum Goal */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 text-purple-650 dark:text-purple-400 rounded-xl">
                      <Award className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">Curriculum Goal</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-zinc-900 dark:text-white block">68% <span className="text-xs font-normal text-emerald-605">Complete</span></span>
                    <span className="text-[10px] text-zinc-450 block mt-1 font-semibold">Avg +4% MoM</span>
                  </div>
                </div>
              </div>

              {/* Active Roster Grid */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-zinc-900 dark:text-white">Active Roster</h3>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {teachingRoster.map((rost: any, idx: number) => {
                    const colorClasses = [
                      { border: 'border-l-4 border-l-blue-600', bg: 'bg-blue-600', tag: 'EXPLORER' },
                      { border: 'border-l-4 border-l-amber-600', bg: 'bg-amber-600', tag: 'PIONEER' },
                      { border: 'border-l-4 border-l-emerald-600', bg: 'bg-emerald-600', tag: 'VISIONARY' }
                    ];
                    const design = colorClasses[idx % 3];
                    const progress = ((rost.class_id * 17) % 55) + 40;
                    
                    // Determine sub-topic based on subject
                    let subtopic = 'Basic Concepts';
                    if (rost.subject_name.toLowerCase().includes('matematika')) subtopic = 'Fractions & Decimals';
                    else if (rost.subject_name.toLowerCase().includes('ipa')) subtopic = 'Ecosystems';
                    else if (rost.subject_name.toLowerCase().includes('sbdp')) subtopic = 'Color Theory';
                    else if (rost.subject_name.toLowerCase().includes('indo')) subtopic = 'Struktur Kalimat';

                    return (
                      <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                        
                        {/* Top Accent Class Banner */}
                        <div className={`p-5 text-white ${design.bg} space-y-1`}>
                          <h4 className="text-xl font-black">{rost.class_name.replace(/(\d+)([A-Z]+)/, '$1-$2')}</h4>
                          <span className="text-[9px] font-black tracking-widest opacity-80 block uppercase">{design.tag}</span>
                        </div>

                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            {/* Subject Title & Room */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-zinc-900 dark:text-white truncate block max-w-[140px]">{rost.subject_name}</span>
                                <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-550/20">
                                  {idx === 0 ? 'Active Now' : idx === 1 ? 'Next: 10:30' : 'Afternoon'}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-450 font-semibold block">
                                {getRoom(rost.class_name, rost.subject_name)} &bull; {rost.student_count} Students
                              </span>
                            </div>

                            {/* Syllabus Progress */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] font-bold text-zinc-450">
                                <span className="truncate max-w-[110px]">Syllabus: {subtopic}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-3">
                            <Link
                              href={`/dashboard/teacher?tab=attendance&classId=${rost.class_id}`}
                              className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black text-center"
                            >
                              Mark Attendance
                            </Link>
                            <Link
                              href={`/dashboard/teacher?tab=grades&classId=${rost.class_id}&subjectId=${rost.subject_id}`}
                              className="px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-950 rounded-xl text-[10px] font-black text-center"
                            >
                              Enter Grades
                            </Link>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                  {/* Dotted Request card */}
                  <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 cursor-pointer min-h-[220px]">
                    <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-850 flex items-center justify-center text-zinc-400">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-zinc-800 dark:text-white">Request Section Assignment</h4>
                      <p className="text-[10px] text-zinc-400 max-w-[170px] mx-auto mt-1 leading-relaxed">
                        Need to manage a different class? Contact administration to update your roster.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completion Matrix Section */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">Curriculum Completion Matrix</h3>
                    <p className="text-[10px] text-zinc-450">Tracking your syllabus progress across all teaching sections.</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                    View Detailed Syllabus <ChevronRight className="h-3 w-3" />
                  </span>
                </div>

                <div className="space-y-4 pt-2">
                  {teachingRoster.map((rost: any, idx: number) => {
                    const progress = ((rost.class_id * 17) % 55) + 40;
                    let quarterTopic = 'Q2: Basic Concepts';
                    if (rost.subject_name.toLowerCase().includes('matematika')) quarterTopic = 'Q2: Fractions & Decimals';
                    else if (rost.subject_name.toLowerCase().includes('ipa')) quarterTopic = 'Q2: Life Cycles';
                    else if (rost.subject_name.toLowerCase().includes('sbdp')) quarterTopic = 'Q2: Mixed Media';
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 text-xs font-bold">
                        <div className="min-w-[180px]">
                          <span className="text-zinc-850 dark:text-white block">{rost.subject_name} ({rost.class_name})</span>
                          <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{quarterTopic}</span>
                        </div>
                        <div className="flex-1 max-w-xl h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-zinc-900 dark:text-white min-w-[40px] text-right font-black">{progress}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* SUBTAB 2: WALI KELAS */}
          {subTab === 'homeroom' && (
            <div className="space-y-6">
              {!myHomeroomClass ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl text-center space-y-2 text-zinc-400 italic">
                  Anda bukan Wali Kelas dari kelas mana pun saat ini.
                </div>
              ) : (
                <div className="grid lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left columns (2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Student List Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                      <div className="p-5 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white">Student List</h4>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/teacher?tab=classes&subTab=homeroom&addStudent=true`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-xs"
                          >
                            <Plus className="h-3 w-3" />
                            Add Student
                          </Link>
                          <a
                            href={`/api/classes/export?classId=${myHomeroomClass.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-[10px] font-black cursor-pointer bg-white dark:bg-zinc-900"
                          >
                            <Download className="h-3 w-3" />
                            Export CSV
                          </a>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-650 dark:text-zinc-400">
                          <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-150 dark:border-zinc-850">
                            <tr>
                              <th className="px-5 py-3.5 text-center w-12">No</th>
                              <th className="px-5 py-3.5">Student Name</th>
                              <th className="px-5 py-3.5">Student ID</th>
                              <th className="px-5 py-3.5">Gender</th>
                              <th className="px-5 py-3.5">Status/Information</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                            {homeroomStudents.length > 0 ? (
                              homeroomStudents.map((stud: any, idx: number) => {
                                const initials = stud.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                
                                // Blend of present/excused/alpha
                                const isExcused = idx % 10 === 1;
                                const isAlpha = idx % 10 === 3;
                                const statusLabel = isExcused ? 'Sick (Excused)' : isAlpha ? 'Alpha' : 'Present';
                                const statusColor = isExcused 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30'
                                  : isAlpha
                                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-450 dark:border-red-900/30'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30';

                                return (
                                  <tr key={stud.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/5">
                                    <td className="px-5 py-3 text-center text-zinc-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                                    <td className="px-5 py-3 flex items-center gap-3">
                                      <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                        {initials}
                                      </div>
                                      <span className="font-bold text-zinc-850 dark:text-white truncate block max-w-[130px]">{stud.full_name}</span>
                                    </td>
                                    <td className="px-5 py-3 font-mono text-zinc-500">{stud.nis}</td>
                                    <td className="px-5 py-3 font-semibold text-zinc-550 capitalize">{stud.gender === 'male' ? 'Male' : 'Female'}</td>
                                    <td className="px-5 py-3">
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>
                                        {statusLabel}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-5 py-6 text-center text-zinc-400 italic">
                                  Belum ada siswa di kelas Anda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Class Schedule Grid */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-zinc-900 dark:text-white">Class Schedule</h4>
                        <button className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-[10px] font-black">
                          Edit Schedule
                        </button>
                      </div>

                      {/* Daily columns grid */}
                      <div className="grid grid-cols-5 gap-3">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                          const dayScheds = homeroomSchedules.filter((s: any) => s.day_name === day);
                          const dayLabelEng = day === 'Senin' ? 'Monday' : day === 'Selasa' ? 'Tuesday' : day === 'Rabu' ? 'Wednesday' : day === 'Kamis' ? 'Thursday' : 'Friday';
                          
                          return (
                            <div key={day} className="space-y-2 bg-zinc-50/50 dark:bg-zinc-950/20 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850">
                              <span className="text-[10px] font-black text-zinc-400 block border-b border-zinc-200 dark:border-zinc-800 pb-1.5">{dayLabelEng}</span>
                              <div className="space-y-1.5">
                                {dayScheds.length > 0 ? (
                                  dayScheds.map((sch: any) => (
                                    <div key={sch.id} className="p-2 bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-lg space-y-1 shadow-2xs hover:border-blue-450 transition-colors">
                                      <span className="text-[9px] font-black text-zinc-850 dark:text-white leading-tight block">{sch.subject_name}</span>
                                      <span className="text-[8px] text-zinc-400 font-semibold block">{sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-[8px] text-zinc-400 italic block py-4 text-center">No class</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right column (1 col) */}
                  <div className="space-y-6">
                    
                    {/* Cleaning Schedule */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cleaning Schedule</h4>
                          <span className="text-[10px] text-zinc-450 block mt-0.5">Jadwal Piket Kelas</span>
                        </div>
                        <button className="px-2.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-350 rounded-xl text-[9px] font-black">
                          Manage Roster
                        </button>
                      </div>

                      <div className="space-y-3">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
                          const members = cleaningSchedule[day] || [];
                          return (
                            <div key={day} className="space-y-1">
                              <span className="text-[9px] font-black text-blue-650 dark:text-blue-400 block uppercase tracking-wider">{day}</span>
                              <div className="flex flex-wrap gap-1">
                                {members.length > 0 ? (
                                  members.map((name, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 text-[9px] font-bold text-zinc-650 dark:text-zinc-350 rounded-md">
                                      {name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[9px] text-zinc-400 italic">No duties</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Class Summary Card */}
                    <div className="bg-blue-600 dark:bg-blue-700 text-white p-5 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-blue-150">Class Summary</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Total Students</span>
                          <span className="text-sm font-black">{homeroomStudents.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>Attendance Rate</span>
                          <span className="text-sm font-black">96%</span>
                        </div>
                        <div className="h-1.5 w-full bg-blue-700 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: '96%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Upcoming Deadlines</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 border-l-2 border-l-red-500 pl-3">
                          <div>
                            <span className="text-[10px] font-black text-zinc-800 dark:text-white block">Midterm Grades Entry</span>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">Due in 2 days</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 border-l-2 border-l-emerald-500 pl-3">
                          <div>
                            <span className="text-[10px] font-black text-zinc-800 dark:text-white block">Student Parent Meeting</span>
                            <span className="text-[9px] text-zinc-400 block mt-0.5">Friday, 14:00</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 3: REPORT CENTER */}
          {subTab === 'report' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl text-center space-y-2 text-zinc-400 italic">
              Halaman Report Center Kosong (Placeholder).
            </div>
          )}

        </div>
      )}

      {/* --- ATTENDANCE TAB --- */}
      {tab === 'attendance' && (
        <div className="flex flex-col gap-6">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                {subTab === 'recap' ? 'Dashboard / My Classes / Attendance' : 'Attendance'}
              </span>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">
                {subTab === 'recap' 
                  ? `Attendance Recap - Class ${activeClass ? activeClass.name.replace(/(\d+)([A-Z]+)/, '$1-$2') : ''}` 
                  : 'Attendance Entry'
                }
              </h2>
            </div>

            {/* Quick selectors for Classes */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Class:</span>
              <div className="flex flex-wrap gap-1">
                {classesTaught.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/teacher?tab=attendance&subTab=${subTab}&classId=${c.id}&subjectId=${subjectIdParam || 'daily'}&date=${dateParam}`}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all ${
                      activeClassId === c.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-55'
                    }`}
                  >
                    {c.name.replace(/(\d+)([A-Z]+)/, '$1-$2')}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Subtab Navigation (Mark Attendance vs Recap) */}
          <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <Link
              href={`/dashboard/teacher?tab=attendance&subTab=entry&classId=${activeClassId}&subjectId=${subjectIdParam || 'daily'}&date=${dateParam}`}
              className={`text-xs font-bold transition-colors pb-2 -mb-[13px] border-b-2 ${
                subTab === 'entry'
                  ? 'border-blue-600 text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-450 hover:text-zinc-700'
              }`}
            >
              Attendance Entry
            </Link>
            <Link
              href={`/dashboard/teacher?tab=attendance&subTab=recap&classId=${activeClassId}&subjectId=${subjectIdParam || 'daily'}&date=${dateParam}`}
              className={`text-xs font-bold transition-colors pb-2 -mb-[13px] border-b-2 ${
                subTab === 'recap'
                  ? 'border-blue-600 text-zinc-900 dark:text-white'
                  : 'border-transparent text-zinc-450 hover:text-zinc-700'
              }`}
            >
              Attendance Recap
            </Link>
          </div>

          {/* If no class resolved, show placeholder */}
          {!activeClassId ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl text-center space-y-2 text-zinc-400 italic">
              Anda tidak memiliki daftar mengajar kelas aktif di database.
            </div>
          ) : (
            <>
              {/* SUBTAB 1: ATTENDANCE ENTRY */}
              {subTab === 'entry' && (
                <form action={handleSaveAttendance} className="space-y-6">
                  <input type="hidden" name="classId" value={activeClassId} />
                  <input type="hidden" name="subjectId" value={subjectIdParam || 'daily'} />
                  <input type="hidden" name="sessionDate" value={dateParam} />
                  <input type="hidden" name="subTab" value="entry" />

                  {/* Top Details & Date Navigation bar */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                        Class {activeClass?.name.replace(/(\d+)([A-Z]+)/, '$1-$2')} Explorer
                      </h3>
                      
                      {/* Subject Selection dropdown/pills */}
                      <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <Link
                          href={`/dashboard/teacher?tab=attendance&subTab=entry&classId=${activeClassId}&subjectId=daily&date=${dateParam}`}
                          className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                            !activeSubject
                              ? 'bg-blue-600 text-white'
                              : 'text-zinc-500 hover:text-zinc-700'
                          }`}
                        >
                          Daily Attendance
                        </Link>
                        {subjectsTaught.map((s) => (
                          <Link
                            key={s.id}
                            href={`/dashboard/teacher?tab=attendance&subTab=entry&classId=${activeClassId}&subjectId=${s.id}&date=${dateParam}`}
                            className={`px-2 py-0.5 text-[9px] font-black rounded-md ${
                              activeSubject?.id === s.id
                                ? 'bg-blue-600 text-white'
                                : 'text-zinc-500 hover:text-zinc-700'
                            }`}
                          >
                            {s.name}
                          </Link>
                        ))}
                      </div>
                      
                      <span className="text-[10px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-lg text-zinc-450 font-bold">
                        {activeSubject ? 'Subject Class Session' : 'Mon, Wed, Fri'}
                      </span>
                    </div>

                    {/* Date picker navigation */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/teacher?tab=attendance&subTab=entry&classId=${activeClassId}&subjectId=${subjectIdParam || 'daily'}&date=${
                          new Date(new Date(dateParam).getTime() - 24*60*60*1000).toISOString().split('T')[0]
                        }`}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg text-zinc-450"
                      >
                        <ChevronRight className="h-4 w-4 rotate-180" />
                      </Link>

                      <div className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-black text-zinc-700 dark:text-zinc-350 bg-white dark:bg-zinc-900">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>
                          {new Date(dateParam).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </span>
                      </div>

                      <Link
                        href={`/dashboard/teacher?tab=attendance&subTab=entry&classId=${activeClassId}&subjectId=${subjectIdParam || 'daily'}&date=${
                          new Date(new Date(dateParam).getTime() + 24*60*60*1000).toISOString().split('T')[0]
                        }`}
                        className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-lg text-zinc-450"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>

                      <button className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-[10px] font-black ml-2">
                        Export List
                      </button>
                      <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Mark All Present
                      </button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left Column stats & notice */}
                    <div className="space-y-6">
                      
                      {/* Stats Card */}
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-850 pb-2">Today's Stats</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-600 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" />
                              Present
                            </span>
                            <span className="text-zinc-900 dark:text-white font-mono text-sm">{todayPresentCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-red-600 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-red-500 rounded-full" />
                              Absent
                            </span>
                            <span className="text-zinc-900 dark:text-white font-mono text-sm">{todayAbsentCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-amber-600 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                              Late
                            </span>
                            <span className="text-zinc-900 dark:text-white font-mono text-sm">{todayLateCount}</span>
                          </div>
                          {todaySickCount > 0 && (
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-blue-600 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 bg-blue-500 rounded-full" />
                                Sick / Perm
                              </span>
                              <span className="text-zinc-900 dark:text-white font-mono text-sm">{todaySickCount}</span>
                            </div>
                          )}
                          <div className="border-t border-zinc-100 dark:border-zinc-850 pt-3 flex items-center justify-between text-xs font-bold">
                            <span className="text-zinc-450">Total Students</span>
                            <span className="text-zinc-900 dark:text-white font-mono">{attendanceStudents.length}</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-105 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full" 
                              style={{ width: `${attendanceStudents.length > 0 ? (todayPresentCount / attendanceStudents.length) * 100 : 0}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Notice Card */}
                      <div className="bg-blue-600 dark:bg-blue-700 text-white p-5 rounded-2xl shadow-xs space-y-3 relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-150">Notice</h4>
                          <p className="text-[10px] font-semibold leading-relaxed">
                            Flu season alert. 3 students from neighboring {activeClass?.name === '4C' ? '4-B' : '4-C'} are out today.
                          </p>
                        </div>
                        <button type="button" className="text-[9px] font-black underline text-blue-150 hover:text-white block relative z-10">
                          Dismiss
                        </button>
                        <div className="absolute right-[-20px] bottom-[-20px] h-20 w-20 bg-white/10 rounded-full flex items-center justify-center border border-white/5 pointer-events-none">
                          <Award className="h-10 w-10 text-white/20" />
                        </div>
                      </div>

                    </div>

                    {/* Right column table list */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-zinc-650 dark:text-zinc-400">
                          <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-150 dark:border-zinc-850">
                            <tr>
                              <th className="px-5 py-3.5">Student Name</th>
                              <th className="px-5 py-3.5 text-center">Status Selection</th>
                              <th className="px-5 py-3.5 text-right w-36">Last Update</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                            {attendanceStudents.map((stud: any) => {
                              const initials = stud.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                              const record = attendanceRecordsMap[stud.id];
                              const activeStatus = record ? record.status : 'present';

                              return (
                                <tr key={stud.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/5">
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                        {initials}
                                      </div>
                                      <div>
                                        <span className="font-bold text-zinc-850 dark:text-white block">{stud.full_name}</span>
                                        <span className="text-[9px] text-zinc-400 font-mono mt-0.5 block">Student ID: #{stud.nis.slice(-4)}</span>
                                      </div>
                                    </div>
                                  </td>
                                  
                                  {/* Custom styled radio inputs for P, L, A, E */}
                                  <td className="px-5 py-4 text-center">
                                    <div className="inline-flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded-full border border-zinc-150 dark:border-zinc-800">
                                      {[
                                        { key: 'present', label: 'P', color: 'peer-checked:bg-emerald-600 peer-checked:text-white font-black' },
                                        { key: 'late', label: 'L', color: 'peer-checked:bg-amber-600 peer-checked:text-white font-black' },
                                        { key: 'absent', label: 'A', color: 'peer-checked:bg-red-650 peer-checked:text-white font-black' },
                                        { key: 'sick', label: 'E', color: 'peer-checked:bg-blue-600 peer-checked:text-white font-black' } // Excused proxy
                                      ].map((opt) => (
                                        <label key={opt.key} className="cursor-pointer relative block h-6 w-6">
                                          <input 
                                            type="radio" 
                                            name={`studentStatus_${stud.id}`} 
                                            value={opt.key} 
                                            defaultChecked={activeStatus === opt.key}
                                            className="sr-only peer"
                                          />
                                          <span className={`absolute inset-0 rounded-full flex items-center justify-center text-[9px] font-bold text-zinc-450 bg-transparent hover:bg-zinc-150 dark:hover:bg-zinc-850 transition-colors ${opt.color}`}>
                                            {opt.label}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                  </td>

                                  <td className="px-5 py-4 text-right">
                                    <span className={`text-[10px] font-bold ${
                                      activeStatus === 'present' 
                                        ? 'text-zinc-400' 
                                        : activeStatus === 'absent'
                                        ? 'text-red-500'
                                        : activeStatus === 'late'
                                        ? 'text-amber-650'
                                        : 'text-blue-500'
                                    }`}>
                                      {activeStatus === 'present' 
                                        ? 'Default: Present' 
                                        : activeStatus === 'absent'
                                        ? 'Marked Absent'
                                        : activeStatus === 'late'
                                        ? 'Late Arrival'
                                        : 'Excused (Sick)'
                                      }
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-850 text-center text-[10px] text-zinc-400 font-bold">
                        Showing {attendanceStudents.length} of {attendanceStudents.length} Students
                      </div>
                    </div>

                  </div>

                  {/* Bottom sticky submitting bar */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-md flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Submitting For</span>
                      <h4 className="text-xs font-black text-zinc-900 dark:text-white mt-0.5">
                        Class {activeClass?.name.replace(/(\d+)([A-Z]+)/, '$1-$2')} Explorer &bull; {new Date(dateParam).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </h4>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex items-center gap-3 border-r border-zinc-200 dark:border-zinc-800 pr-4 text-center">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block">Present</span>
                          <span className="text-xs font-black text-emerald-600">{todayPresentCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block">Absent</span>
                          <span className="text-xs font-black text-red-600">{todayAbsentCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 font-bold block">Late</span>
                          <span className="text-xs font-black text-amber-650">{todayLateCount}</span>
                        </div>
                      </div>

                      <button type="button" className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850">
                        Save Draft
                      </button>
                      <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer">
                        Submit Attendance
                      </button>
                    </div>
                  </div>

                </form>
              )}

              {/* SUBTAB 2: ATTENDANCE RECAP */}
              {subTab === 'recap' && (
                <div className="space-y-6">
                  
                  {/* Top recap filters banner */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
                      <div>
                        <span className="text-[9px] text-zinc-400 block uppercase tracking-wider mb-1">View Type</span>
                        <span className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 block">
                          Monthly Overview
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block uppercase tracking-wider mb-1">Month</span>
                        <span className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 block">
                          {new Date(dateParam).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 block uppercase tracking-wider mb-1">Subject</span>
                        <span className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 block">
                          {activeSubject ? activeSubject.name : 'All Subjects'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-zinc-400 block mr-2">
                        {new Date(dateParam).toLocaleDateString('en-US', { month: 'short' })} 1 - {new Date(dateParam).toLocaleDateString('en-US', { month: 'short' })} 30
                      </span>
                      
                      <button className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-black flex items-center gap-1">
                        <Printer className="h-3.5 w-3.5 text-zinc-400" /> Export PDF
                      </button>
                      <button className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-black flex items-center gap-1">
                        <Download className="h-3.5 w-3.5 text-zinc-400" /> Export Excel
                      </button>
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-zinc-400">
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded flex items-center justify-center text-[9px] font-bold">P</span> Present</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-red-50 text-red-700 border border-red-200 rounded flex items-center justify-center text-[9px] font-bold">A</span> Absent</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-amber-50 text-amber-700 border border-amber-200 rounded flex items-center justify-center text-[9px] font-bold">L</span> Late</span>
                    <span className="flex items-center gap-1.5"><span className="h-4 w-4 bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center justify-center text-[9px] font-bold">E</span> Excused</span>
                  </div>

                  {/* Recap Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-650 dark:text-zinc-400">
                        <thead className="bg-zinc-50 dark:bg-zinc-950 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-150 dark:border-zinc-850">
                          <tr>
                            <th className="px-5 py-3.5 w-44">Student Name</th>
                            {[...Array(10)].map((_, i) => {
                              const dNum = String(i + 1).padStart(2, '0');
                              return (
                                <th key={i} className="px-2 py-3.5 text-center w-12">
                                  {dNum} <span className="block text-[8px] text-zinc-400 font-medium">Jul</span>
                                </th>
                              );
                            })}
                            <th className="px-5 py-3.5 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 w-24">Attendance %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                          {attendanceStudents.map((stud: any) => {
                            const initials = stud.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                            
                            // Let's compute average presence
                            let presentCells = 0;
                            let totalDaysCount = 10;
                            
                            return (
                              <tr key={stud.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/5">
                                <td className="px-5 py-3 flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                    {initials}
                                  </div>
                                  <span className="font-bold text-zinc-850 dark:text-white truncate block max-w-[120px]">{stud.full_name}</span>
                                </td>
                                
                                {/* 10 Days grid cells */}
                                {[...Array(10)].map((_, i) => {
                                  const dayNum = i + 1;
                                  const dateStr = `2026-07-${String(dayNum).padStart(2, '0')}`;
                                  const isWeekend = dayNum === 4 || dayNum === 5 || dayNum === 11 || dayNum === 12; // Static proxy weekends
                                  
                                  let cellVal = 'P';
                                  if (isWeekend) {
                                    cellVal = dayNum === 4 || dayNum === 11 ? 'Sat' : 'Sun';
                                  } else {
                                    // Check DB or fallback
                                    const dbStatus = recapRecordsMap[dateStr]?.[stud.id];
                                    if (dbStatus) {
                                      if (dbStatus === 'present') cellVal = 'P';
                                      else if (dbStatus === 'absent') cellVal = 'A';
                                      else if (dbStatus === 'late') cellVal = 'L';
                                      else cellVal = 'E';
                                    } else {
                                      // Deterministic mockup fallback
                                      const hash = (stud.id * 3 + dayNum * 7) % 100;
                                      if (hash < 3) cellVal = 'A';
                                      else if (hash < 6) cellVal = 'L';
                                      else if (hash < 8) cellVal = 'E';
                                      else cellVal = 'P';
                                    }
                                  }

                                  if (cellVal === 'P' || cellVal === 'E') presentCells++;

                                  const cellColor = cellVal === 'Sat' || cellVal === 'Sun'
                                    ? 'text-zinc-400 font-semibold'
                                    : cellVal === 'P'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-150 rounded h-6 w-6 flex items-center justify-center font-bold text-[10px] mx-auto'
                                    : cellVal === 'A'
                                    ? 'bg-red-50 text-red-700 border border-red-150 rounded h-6 w-6 flex items-center justify-center font-bold text-[10px] mx-auto'
                                    : cellVal === 'L'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-150 rounded h-6 w-6 flex items-center justify-center font-bold text-[10px] mx-auto'
                                    : 'bg-blue-50 text-blue-700 border border-blue-150 rounded h-6 w-6 flex items-center justify-center font-bold text-[10px] mx-auto';

                                  return (
                                    <td key={i} className="px-2 py-3 text-center">
                                      <span className={cellColor}>{cellVal}</span>
                                    </td>
                                  );
                                })}

                                <td className="px-5 py-3 text-center bg-blue-50/20 dark:bg-blue-950/10 text-blue-650 dark:text-blue-400 font-black">
                                  {Math.round((presentCells / (totalDaysCount - 2)) * 100)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-105 dark:border-zinc-850 flex items-center justify-between text-xs text-zinc-400 font-bold">
                      <span>Showing 1-25 of {attendanceStudents.length} students</span>
                      <div className="flex items-center gap-1.5">
                        <button className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-650 disabled:opacity-50" disabled>1</button>
                        <button className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-450">2</button>
                        <button className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-450">Next &gt;</button>
                      </div>
                    </div>
                  </div>

                  {/* Summary grid stats */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Stat 1: Avg Presence */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Average Presence</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">94.2% <span className="text-[10px] text-emerald-600 font-bold">^ 2.1%</span></span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '94.2%' }} />
                      </div>
                    </div>

                    {/* Stat 2: Total Absences */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Total Absences</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">18 <span className="text-[10px] text-zinc-450 font-normal">This Month</span></span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '35%' }} />
                      </div>
                    </div>

                    {/* Stat 3: Late Arrivals */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Late Arrivals</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">24 <span className="text-[10px] text-zinc-450 font-normal">This Month</span></span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
                      </div>
                    </div>

                    {/* Stat 4: Perfect Records */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Perfect Records</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white block mt-1">12 <span className="text-[10px] text-zinc-450 font-normal">Students</span></span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      )}
      {tab !== 'overview' && tab !== 'classes' && tab !== 'attendance' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xs text-center max-w-xl mx-auto space-y-4 my-10">
          <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-450 rounded-full flex items-center justify-center mx-auto">
            <Info className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider">
              Halaman {tab.charAt(0).toUpperCase() + tab.slice(1)} Kosong
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Halaman ini sengaja dikosongkan sesuai permintaan rombak total dashboard guru. Fitur utama dapat diakses pada halaman menu utama Dashboard.
            </p>
          </div>
          <Link
            href="/dashboard/teacher"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <Home className="h-4 w-4" />
            Kembali ke Dashboard
          </Link>
        </div>
      )}

      {/* --- MODAL 1: NEW ANNOUNCEMENT --- */}
      {showNewAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-3">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">Create New Broadcast Announcement</h3>
              <Link 
                href="/dashboard/teacher"
                className="p-1 border border-zinc-250 dark:border-zinc-800 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-lg text-xs"
              >
                Tutup
              </Link>
            </div>

            <form action={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-450 mb-1 uppercase tracking-wider">Judul Pengumuman *</label>
                <input 
                  type="text" name="title" required 
                  placeholder="Contoh: Jadwal Ujian UTS T.A. 2024/2025" 
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-450 mb-1 uppercase tracking-wider">Isi / Detail Pengumuman *</label>
                <textarea 
                  name="content" required rows={4}
                  placeholder="Tulis detail pengumuman yang ingin disebarkan kepada seluruh murid dan wali kelas..." 
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link
                  href="/dashboard/teacher"
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Kirim Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: MESSAGE --- */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-3">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">Kirim Pesan Cepat</h3>
              <Link 
                href="/dashboard/teacher"
                className="p-1 border border-zinc-250 dark:border-zinc-800 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-lg text-xs"
              >
                Tutup
              </Link>
            </div>

            <form action={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-455 mb-1 uppercase tracking-wider">Nama Penerima / Orang Tua / Staff *</label>
                <input 
                  type="text" name="recipient" required 
                  placeholder="Contoh: Orang Tua Budi Santoso" 
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-455 mb-1 uppercase tracking-wider">Isi Pesan *</label>
                <textarea 
                  name="message" required rows={4}
                  placeholder="Tulis isi pesan pribadi Anda..." 
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link
                  href="/dashboard/teacher"
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Kirim Pesan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ADD STUDENT --- */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-3">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                {subTab === 'homeroom' && myHomeroomClass
                  ? `Pendaftaran Siswa Baru - Kelas ${myHomeroomClass.name}`
                  : 'Pendaftaran Siswa Baru (Unassigned)'
                }
              </h3>
              <Link 
                href={subTab === 'homeroom' && myHomeroomClass ? "/dashboard/teacher?tab=classes&subTab=homeroom" : "/dashboard/teacher"}
                className="p-1 border border-zinc-250 dark:border-zinc-800 text-zinc-400 hover:text-zinc-650 dark:hover:text-white rounded-lg text-xs"
              >
                Tutup
              </Link>
            </div>

            <form action={handleAddStudent} className="space-y-4">
              {subTab === 'homeroom' && myHomeroomClass && (
                <>
                  <input type="hidden" name="classId" value={myHomeroomClass.id} />
                  <input type="hidden" name="isFromClasses" value="true" />
                </>
              )}
              
              <div>
                <label className="block text-[10px] font-bold text-zinc-455 mb-1 uppercase tracking-wider">Nama Lengkap Siswa *</label>
                <input 
                  type="text" name="full_name" required 
                  placeholder="Contoh: Rian Hidayat" 
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-455 mb-1 uppercase tracking-wider">NIS *</label>
                  <input 
                    type="text" name="nis" required 
                    placeholder="Contoh: 24010045" 
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-455 mb-1 uppercase tracking-wider">NISN (10 Digit) *</label>
                  <input 
                    type="text" name="nisn" required 
                    placeholder="Contoh: 0145987654" 
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link
                  href={subTab === 'homeroom' && myHomeroomClass ? "/dashboard/teacher?tab=classes&subTab=homeroom" : "/dashboard/teacher"}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                >
                  Batal
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Daftarkan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
