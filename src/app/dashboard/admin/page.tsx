import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { 
  getClasses, createClass, updateClass, deleteClass,
  getSubjects, createSubject, updateSubject, deleteSubject,
  getAcademicPeriods, createAcademicPeriod, updateAcademicPeriod, deleteAcademicPeriod,
  getExtracurriculars, createExtracurricular, updateExtracurricular, deleteExtracurricular,
  getStudents, createStudent, updateStudent, deleteStudent
} from '../../../lib/services/classService';
import { 
  getTeacherProfiles, getCoachProfiles, getParentProfiles, getPrincipalProfile,
  createUserAccount, updateUserAccount, deleteUserAccount
} from '../../../lib/services/userService';
import { 
  getStaffAttendanceForDate, recordStaffAttendance, getStaffAttendanceHistory
} from '../../../lib/services/attendanceService';
import { 
  Users, BookOpen, Calendar, Award, CheckSquare,
  Plus, Edit2, Trash2, ShieldAlert, Check,
  Megaphone, CalendarDays, Activity, GraduationCap,
  TrendingUp, ChevronLeft, ChevronRight, Bell,
  Search, Eye, Printer, Download, X,
  ArrowLeft, Tent, Bot, Mic, Trophy, Sparkles, Clock, MapPin, Shirt, Compass,
  AlertCircle, CheckCircle2, ChevronDown, CalendarCheck
} from 'lucide-react';
import Link from 'next/link';
import { DeleteButton } from '../../../components/ui/DeleteButton';
import { Toast } from '../../../components/ui/Toast';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { AttendanceFilterBar } from '../../../components/ui/AttendanceFilterBar';
import { AutoSubmitSelect } from '../../../components/ui/AutoSubmitSelect';

export const metadata = {
  title: 'Super Admin Dashboard - E-Monitor SD',
};

export default async function AdminDashboard(props: {
  searchParams: Promise<{ 
    tab?: string; date?: string; error?: string; success?: string; editId?: string; 
    startDate?: string; endDate?: string; filterUserId?: string; filterRole?: string; 
    announcementEditId?: string; eventEditId?: string;
    search?: string; grade?: string; status?: string; page?: string; detailStudentId?: string;
    ekskulEditId?: string; detailEkskulId?: string;
    periodEditId?: string; periodNew?: string;
    classEditId?: string; classNew?: string; detailClassId?: string; classGrade?: string;
    subjectEditId?: string; detailSubjectId?: string; subjectNew?: string;
    subClass?: string; subCategory?: string; subSearch?: string;
    scheduleEditId?: string; scheduleNew?: string;
    viewCalendarPeriodId?: string; calendarEventEditId?: string
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'super_admin') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const currentDate = searchParams.date || new Date().toISOString().split('T')[0];
  const editId = searchParams.editId;
  const errorMsg = searchParams.error;
  const successMsg = searchParams.success;
  const announcementEditId = searchParams.announcementEditId ? parseInt(searchParams.announcementEditId, 10) : null;
  const eventEditId = searchParams.eventEditId ? parseInt(searchParams.eventEditId, 10) : null;
  const stuSearch = searchParams.search || '';
  const stuGrade = searchParams.grade || '';
  const stuStatus = searchParams.status || 'active'; // Default is 'active' (Aktif Belajar)
  const stuPage = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const detailStudentId = searchParams.detailStudentId;
  const stuLimit = 5;
  const stuOffset = (stuPage - 1) * stuLimit;
  const ekskulEditId = searchParams.ekskulEditId;
  const detailEkskulId = searchParams.detailEkskulId ? parseInt(searchParams.detailEkskulId, 10) : null;
  const periodEditId = searchParams.periodEditId ? parseInt(searchParams.periodEditId, 10) : null;
  const periodNew = searchParams.periodNew === 'true';
  const subjectEditId = searchParams.subjectEditId ? parseInt(searchParams.subjectEditId, 10) : null;
  const detailSubjectId = searchParams.detailSubjectId ? parseInt(searchParams.detailSubjectId, 10) : null;
  const subjectNew = searchParams.subjectNew === 'true';
  const subClass = searchParams.subClass || 'Semua';
  const subCategory = searchParams.subCategory || 'Semua';
  const subSearch = searchParams.subSearch || '';
  const scheduleEditId = searchParams.scheduleEditId ? parseInt(searchParams.scheduleEditId, 10) : null;
  const scheduleNew = searchParams.scheduleNew === 'true';
  const viewCalendarPeriodId = searchParams.viewCalendarPeriodId ? parseInt(searchParams.viewCalendarPeriodId, 10) : null;
  const calendarEventEditId = searchParams.calendarEventEditId ? parseInt(searchParams.calendarEventEditId, 10) : null;
  const classEditId = searchParams.classEditId ? parseInt(searchParams.classEditId, 10) : null;
  const classNew = searchParams.classNew === 'true';
  const detailClassId = searchParams.detailClassId ? parseInt(searchParams.detailClassId, 10) : null;
  const classGrade = searchParams.classGrade || 'Semua';


  // Attendance history filters
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = today.slice(0, 7) + '-01';
  const attStartDate = searchParams.startDate || firstOfMonth;
  const attEndDate = searchParams.endDate || today;
  const attFilterUserId = searchParams.filterUserId ? parseInt(searchParams.filterUserId, 10) : null;
  const attFilterRole = searchParams.filterRole || '';

  // --- SERVER ACTIONS FOR CRUD ---

  async function handleClass(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const classId = formData.get('classId') as string;
    const name = formData.get('name') as string;
    const gradeLevel = parseInt(formData.get('grade_level') as string, 10);
    const homeroomTeacherIdStr = formData.get('homeroom_teacher_id') as string;
    const homeroomTeacherId = homeroomTeacherIdStr ? parseInt(homeroomTeacherIdStr, 10) : null;

    try {
      if (actionType === 'delete') {
        await deleteClass(parseInt(classId, 10));
        redirect('/dashboard/admin?tab=classes&success=Kelas berhasil dihapus');
      } else if (classId) {
        await updateClass(parseInt(classId, 10), name, gradeLevel, homeroomTeacherId);
        redirect('/dashboard/admin?tab=classes&success=Kelas berhasil diperbarui');
      } else {
        await createClass(name, gradeLevel, homeroomTeacherId);
        redirect('/dashboard/admin?tab=classes&success=Kelas berhasil dibuat');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=classes&error=${encodeURIComponent(err.message || 'Gagal menyimpan kelas')}`);
    }
  }

  async function handleClassStudent(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const classId = formData.get('classId') as string;
    const studentId = formData.get('studentId') as string;

    try {
      if (actionType === 'assign_student') {
        await pool.query('UPDATE student_profiles SET class_id = ? WHERE id = ?', [parseInt(classId, 10), parseInt(studentId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memasukkan siswa ID: ${studentId} ke kelas ID: ${classId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=classes&detailClassId=${classId}&success=Siswa berhasil dimasukkan ke kelas`);
      } else if (actionType === 'remove_student') {
        await pool.query('UPDATE student_profiles SET class_id = NULL WHERE id = ?', [parseInt(studentId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Mengeluarkan siswa ID: ${studentId} dari kelas ID: ${classId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=classes&detailClassId=${classId}&success=Siswa berhasil dikeluarkan dari kelas`);
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=classes&detailClassId=${classId}&error=${encodeURIComponent(err.message || 'Gagal mengatur keanggotaan siswa')}`);
    }
  }

  async function handleSubject(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const subjectId = formData.get('subjectId') as string;
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const gradeLevel = formData.getAll('grade_levels').join(',');
    const isCore = formData.get('is_core') === 'true' || formData.get('is_core') === 'on';
    const description = formData.get('description') as string;
    const weeklyHours = parseInt(formData.get('weekly_hours') as string || '4', 10);

    try {
      if (actionType === 'delete') {
        // Delete all teacher subject assignments linked to this subject first
        await pool.query('DELETE FROM teacher_subjects WHERE subject_id = ?', [parseInt(subjectId, 10)]);
        await deleteSubject(parseInt(subjectId, 10));

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus mata pelajaran: ${code} - ${name}`, 'Sistem']
        );

        redirect('/dashboard/admin?tab=subjects&success=Mata pelajaran berhasil dihapus');
      } else if (subjectId) {
        await pool.query(`
          UPDATE subjects 
          SET code = ?, name = ?, category = ?, grade_level = ?, is_core = ?, description = ?, weekly_hours = ? 
          WHERE id = ?
        `, [code, name, category, gradeLevel, isCore, description || null, weeklyHours, parseInt(subjectId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memperbarui mata pelajaran: ${code} - ${name}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=subjects&detailSubjectId=${subjectId}&success=Mata pelajaran berhasil diperbarui`);
      } else {
        const [res] = await pool.query(`
          INSERT INTO subjects (code, name, category, grade_level, is_core, description, weekly_hours) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [code, name, category, gradeLevel, isCore, description || null, weeklyHours]);
        const newId = (res as any).insertId;

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Membuat mata pelajaran baru: ${code} - ${name}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=subjects&detailSubjectId=${newId}&success=Mata pelajaran berhasil dibuat`);
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=subjects&error=${encodeURIComponent(err.message || 'Gagal menyimpan mata pelajaran')}`);
    }
  }

  async function handleTeacherSubjectAssignment(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const subjectId = formData.get('subjectId') as string;
    const assignmentId = formData.get('assignmentId') as string;

    try {
      if (actionType === 'delete') {
        await pool.query('DELETE FROM teacher_subjects WHERE id = ?', [parseInt(assignmentId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus penugasan pengajar kelas ID: ${assignmentId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=subjects&detailSubjectId=${subjectId}&success=Penugasan pengajar berhasil dihapus`);
      } else {
        const classId = parseInt(formData.get('classId') as string, 10);
        const teacherId = parseInt(formData.get('teacherId') as string, 10);

        // Check if assignment already exists
        const [exists] = await pool.query(`
          SELECT id FROM teacher_subjects 
          WHERE subject_id = ? AND class_id = ? AND teacher_id = ?
        `, [parseInt(subjectId, 10), classId, teacherId]) as any[];

        if (exists.length > 0) {
          throw new Error('Penugasan kelas dan guru ini sudah ada.');
        }

        await pool.query(`
          INSERT INTO teacher_subjects (subject_id, class_id, teacher_id) 
          VALUES (?, ?, ?)
        `, [parseInt(subjectId, 10), classId, teacherId]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menugaskan guru ID ${teacherId} pada kelas ID ${classId} untuk pelajaran ID ${subjectId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=subjects&detailSubjectId=${subjectId}&success=Penugasan pengajar berhasil ditambahkan`);
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=subjects&detailSubjectId=${subjectId}&error=${encodeURIComponent(err.message || 'Gagal menyimpan penugasan pengajar')}`);
    }
  }

  async function handleClassSchedule(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const scheduleId = formData.get('scheduleId') as string;
    const classIdVal = formData.get('classId') as string;
    const returnClass = formData.get('returnClass') as string || subClass;

    try {
      if (actionType === 'delete') {
        await pool.query('DELETE FROM class_schedules WHERE id = ?', [parseInt(scheduleId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus slot jadwal pelajaran ID: ${scheduleId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=subjects&subClass=${returnClass}&success=Slot jadwal pelajaran berhasil dihapus`);
      } else {
        const classId = parseInt(classIdVal, 10);
        const dayName = formData.get('day_name') as string;
        const startTime = formData.get('start_time') as string;
        const endTime = formData.get('end_time') as string;
        const subjectId = parseInt(formData.get('subjectId') as string, 10);
        const teacherId = parseInt(formData.get('teacherId') as string, 10);

        if (scheduleId) {
          await pool.query(`
            UPDATE class_schedules 
            SET class_id = ?, day_name = ?, start_time = ?, end_time = ?, subject_id = ?, teacher_id = ? 
            WHERE id = ?
          `, [classId, dayName, startTime, endTime, subjectId, teacherId, parseInt(scheduleId, 10)]);

          // Log activity
          await pool.query(
            'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
            [session!.userId, session!.name, `Memperbarui slot jadwal pelajaran ID: ${scheduleId}`, 'Sistem']
          );

          redirect(`/dashboard/admin?tab=subjects&subClass=${returnClass}&success=Slot jadwal pelajaran berhasil diperbarui`);
        } else {
          await pool.query(`
            INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [classId, dayName, startTime, endTime, subjectId, teacherId]);

          // Log activity
          await pool.query(
            'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
            [session!.userId, session!.name, `Menambahkan slot jadwal pelajaran baru di Kelas ID: ${classId}`, 'Sistem']
          );

          redirect(`/dashboard/admin?tab=subjects&subClass=${returnClass}&success=Slot jadwal pelajaran berhasil ditambahkan`);
        }
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=subjects&subClass=${returnClass}&error=${encodeURIComponent(err.message || 'Gagal menyimpan jadwal pelajaran')}`);
    }
  }

  async function handleCalendarEvent(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const eventId = formData.get('eventId') as string;
    const periodIdVal = formData.get('periodId') as string;
    const returnPeriod = formData.get('returnPeriod') as string || (viewCalendarPeriodId ? String(viewCalendarPeriodId) : '');

    try {
      if (actionType === 'delete') {
        await pool.query('DELETE FROM academic_calendar_events WHERE id = ?', [parseInt(eventId, 10)]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus agenda kalender ID: ${eventId}`, 'Sistem']
        );

        redirect(`/dashboard/admin?tab=periods&viewCalendarPeriodId=${returnPeriod}&success=Agenda kalender berhasil dihapus`);
      } else {
        const periodId = parseInt(periodIdVal, 10);
        const eventName = formData.get('event_name') as string;
        const startDate = formData.get('start_date') as string;
        const endDate = formData.get('end_date') as string || startDate;
        const eventType = formData.get('event_type') as string;

        if (eventId) {
          await pool.query(`
            UPDATE academic_calendar_events 
            SET period_id = ?, event_name = ?, start_date = ?, end_date = ?, event_type = ? 
            WHERE id = ?
          `, [periodId, eventName, startDate, endDate, eventType, parseInt(eventId, 10)]);

          // Log activity
          await pool.query(
            'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
            [session!.userId, session!.name, `Memperbarui agenda kalender: ${eventName}`, 'Sistem']
          );

          redirect(`/dashboard/admin?tab=periods&viewCalendarPeriodId=${returnPeriod}&success=Agenda kalender berhasil diperbarui`);
        } else {
          await pool.query(`
            INSERT INTO academic_calendar_events (period_id, event_name, start_date, end_date, event_type) 
            VALUES (?, ?, ?, ?, ?)
          `, [periodId, eventName, startDate, endDate, eventType]);

          // Log activity
          await pool.query(
            'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
            [session!.userId, session!.name, `Menambahkan agenda kalender baru: ${eventName}`, 'Sistem']
          );

          redirect(`/dashboard/admin?tab=periods&viewCalendarPeriodId=${returnPeriod}&success=Agenda kalender berhasil ditambahkan`);
        }
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=periods&viewCalendarPeriodId=${returnPeriod}&error=${encodeURIComponent(err.message || 'Gagal menyimpan agenda kalender')}`);
    }
  }

  async function handlePeriod(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const periodId = formData.get('periodId') as string;

    try {
      if (actionType === 'delete') {
        await deleteAcademicPeriod(parseInt(periodId, 10));
        
        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus periode akademik ID: ${periodId}`, 'Sistem']
        );

        redirect('/dashboard/admin?tab=periods&success=Periode akademik berhasil dihapus');
      } 
      
      if (actionType === 'activate') {
        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
          await conn.query('UPDATE academic_periods SET is_active = FALSE');
          await conn.query('UPDATE academic_periods SET is_active = TRUE WHERE id = ?', [parseInt(periodId, 10)]);
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        // Log activity
        const [activeRows] = await pool.query('SELECT name FROM academic_periods WHERE id = ?', [parseInt(periodId, 10)]) as any[];
        const periodName = activeRows.length > 0 ? activeRows[0].name : `ID ${periodId}`;
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Mengaktifkan periode akademik: ${periodName}`, 'Sistem']
        );

        redirect('/dashboard/admin?tab=periods&success=Semester berhasil diaktifkan');
      }

      if (actionType === 'create_year') {
        const academicYear = formData.get('academic_year') as string;
        
        // Ganjil
        const startDateGanjil = formData.get('start_date_ganjil') as string || null;
        const endDateGanjil = formData.get('end_date_ganjil') as string || null;
        const midtermStartGanjil = formData.get('midterm_start_date_ganjil') as string || null;
        const midtermEndGanjil = formData.get('midterm_end_date_ganjil') as string || null;
        const finalStartGanjil = formData.get('final_start_date_ganjil') as string || null;
        const finalEndGanjil = formData.get('final_end_date_ganjil') as string || null;
        const isReleasedGanjil = formData.get('is_released_ganjil') === 'on' || formData.get('is_released_ganjil') === 'true';

        // Genap
        const startDateGenap = formData.get('start_date_genap') as string || null;
        const endDateGenap = formData.get('end_date_genap') as string || null;
        const midtermStartGenap = formData.get('midterm_start_date_genap') as string || null;
        const midtermEndGenap = formData.get('midterm_end_date_genap') as string || null;
        const finalStartGenap = formData.get('final_start_date_genap') as string || null;
        const finalEndGenap = formData.get('final_end_date_genap') as string || null;
        const isReleasedGenap = formData.get('is_released_genap') === 'on' || formData.get('is_released_genap') === 'true';

        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
          // Insert Semester Ganjil (Semester 1)
          await conn.query(`
            INSERT INTO academic_periods (
              name, academic_year, semester, is_active, start_date, end_date, 
              midterm_start_date, midterm_end_date, final_start_date, final_end_date, is_released
            ) VALUES (?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `${academicYear} Ganjil`, academicYear, 1, startDateGanjil, endDateGanjil,
            midtermStartGanjil, midtermEndGanjil, finalStartGanjil, finalEndGanjil, isReleasedGanjil
          ]);

          // Insert Semester Genap (Semester 2)
          await conn.query(`
            INSERT INTO academic_periods (
              name, academic_year, semester, is_active, start_date, end_date, 
              midterm_start_date, midterm_end_date, final_start_date, final_end_date, is_released
            ) VALUES (?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?)
          `, [
            `${academicYear} Genap`, academicYear, 2, startDateGenap, endDateGenap,
            midtermStartGenap, midtermEndGenap, finalStartGenap, finalEndGenap, isReleasedGenap
          ]);

          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Membuat tahun ajaran baru: ${academicYear}`, 'Sistem']
        );

        redirect('/dashboard/admin?tab=periods&success=Tahun ajaran baru berhasil dibuat');
      }

      // Default single period update / edit_period
      if (periodId) {
        const name = formData.get('name') as string;
        const academicYear = formData.get('academic_year') as string;
        const semester = parseInt(formData.get('semester') as string, 10);
        const isActive = formData.get('is_active') === 'true' || formData.get('is_active') === 'on';
        const startDate = formData.get('start_date') as string || null;
        const endDate = formData.get('end_date') as string || null;
        const midtermStartDate = formData.get('midterm_start_date') as string || null;
        const midtermEndDate = formData.get('midterm_end_date') as string || null;
        const finalStartDate = formData.get('final_start_date') as string || null;
        const finalEndDate = formData.get('final_end_date') as string || null;
        const isReleased = formData.get('is_released') === 'on' || formData.get('is_released') === 'true';

        const conn = await pool.getConnection();
        await conn.beginTransaction();
        try {
          if (isActive) {
            await conn.query('UPDATE academic_periods SET is_active = FALSE');
          }
          await conn.query(`
            UPDATE academic_periods 
            SET name = ?, academic_year = ?, semester = ?, is_active = ?, start_date = ?, end_date = ?, 
                midterm_start_date = ?, midterm_end_date = ?, final_start_date = ?, final_end_date = ?, 
                is_released = ?
            WHERE id = ?
          `, [
            name, academicYear, semester, isActive, startDate, endDate,
            midtermStartDate, midtermEndDate, finalStartDate, finalEndDate, isReleased,
            parseInt(periodId, 10)
          ]);
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memperbarui detail semester: ${name}`, 'Sistem']
        );

        redirect('/dashboard/admin?tab=periods&success=Detail semester berhasil diperbarui');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=periods&error=${encodeURIComponent(err.message || 'Gagal memproses periode akademik')}`);
    }
  }

  async function handleEkskul(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const ekskulId = formData.get('ekskulId') as string;
    const name = formData.get('name') as string;
    const coachId = parseInt(formData.get('coach_id') as string, 10);
    const description = formData.get('description') as string;

    // New Fields
    const category = formData.get('category') as string;
    const targetAge = formData.get('target_age') as string;
    const venue = formData.get('venue') as string;
    const uniform = formData.get('uniform') as string;
    const maxCapacity = formData.get('max_capacity') ? parseInt(formData.get('max_capacity') as string, 10) : 20;
    const isOpenReg = formData.get('is_open_reg') === 'on' ? 1 : 0;
    const isPaid = formData.get('is_paid') === 'on' ? 1 : 0;

    // Parse Day of Week checkboxes
    const days = [];
    if (formData.get('day_mon') === 'on') days.push('Senin');
    if (formData.get('day_tue') === 'on') days.push('Selasa');
    if (formData.get('day_wed') === 'on') days.push('Rabu');
    if (formData.get('day_thu') === 'on') days.push('Kamis');
    if (formData.get('day_fri') === 'on') days.push('Jumat');
    if (formData.get('day_sat') === 'on') days.push('Sabtu');
    if (formData.get('day_sun') === 'on') days.push('Minggu');
    const scheduleDay = days.length > 0 ? days.join(' & ') : '';

    // Schedule Time
    const startTime = formData.get('start_time') as string;
    const endTime = formData.get('end_time') as string;
    const scheduleTime = startTime && endTime ? `${startTime} - ${endTime}` : '';

    try {
      if (actionType === 'remove_member') {
        const studentId = parseInt(formData.get('studentId') as string, 10);
        await pool.query('DELETE FROM ekskul_members WHERE extracurricular_id = ? AND student_id = ?', [parseInt(ekskulId, 10), studentId]);
        redirect(`/dashboard/admin?tab=ekskuls&detailEkskulId=${ekskulId}&success=Siswa berhasil dikeluarkan dari ekskul`);
      } else if (actionType === 'delete') {
        await deleteExtracurricular(parseInt(ekskulId, 10));
        
        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus ekstrakurikuler: ${name || 'ID ' + ekskulId}`, 'Ekskul']
        );

        redirect('/dashboard/admin?tab=ekskuls&success=Ekskul berhasil dihapus');
      } else if (ekskulId) {
        await pool.query(`
          UPDATE extracurriculars 
          SET name = ?, coach_id = ?, description = ?, schedule_day = ?, schedule_time = ?, venue = ?, uniform = ?, 
              category = ?, target_age = ?, max_capacity = ?, is_open_reg = ?, is_paid = ?
          WHERE id = ?
        `, [
          name, coachId, description, scheduleDay, scheduleTime, venue, uniform,
          category, targetAge, maxCapacity, isOpenReg, isPaid, parseInt(ekskulId, 10)
        ]);

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memperbarui detail ekstrakurikuler: ${name}`, 'Ekskul']
        );

        redirect(`/dashboard/admin?tab=ekskuls&detailEkskulId=${ekskulId}&success=Ekskul berhasil diperbarui`);
      } else {
        const [res] = await pool.query(`
          INSERT INTO extracurriculars (
            name, coach_id, description, schedule_day, schedule_time, venue, uniform, 
            category, target_age, max_capacity, is_open_reg, is_paid
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name, coachId, description, scheduleDay, scheduleTime, venue, uniform,
          category, targetAge, maxCapacity, isOpenReg, isPaid
        ]) as any[];

        // Log activity
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Membuat ekstrakurikuler baru: ${name}`, 'Ekskul']
        );

        redirect(`/dashboard/admin?tab=ekskuls&detailEkskulId=${res.insertId}&success=Ekskul berhasil dibuat`);
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=ekskuls&error=${encodeURIComponent(err.message || 'Gagal menyimpan ekskul')}`);
    }
  }

  async function handleStudent(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const studentId = formData.get('studentId') as string;
    const nis = formData.get('nis') as string;
    const nisn = formData.get('nisn') as string;
    const fullName = formData.get('full_name') as string;
    const classId = parseInt(formData.get('class_id') as string, 10);
    const gender = formData.get('gender') as string;
    const birthDate = formData.get('birth_date') as string;
    const address = formData.get('address') as string;
    const parentPhone = formData.get('parent_phone') as string;

    try {
      if (actionType === 'delete') {
        await deleteStudent(parseInt(studentId, 10));
        redirect('/dashboard/admin?tab=students&success=Profil murid berhasil dihapus');
      } else if (studentId) {
        await updateStudent(parseInt(studentId, 10), nis, nisn, fullName, classId, gender, birthDate, address, parentPhone);
        redirect('/dashboard/admin?tab=students&success=Profil murid berhasil diperbarui');
      } else {
        await createStudent(nis, nisn, fullName, classId, gender, birthDate, address, parentPhone);
        redirect('/dashboard/admin?tab=students&success=Profil murid berhasil dibuat');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=students&error=${encodeURIComponent(err.message || 'Gagal menyimpan profil murid')}`);
    }
  }

  async function handleStaff(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const userId = formData.get('userId') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const role = formData.get('role') as any;
    
    // Profile inputs
    const nuptk = formData.get('nuptk') as string;
    const nip = formData.get('nip') as string;
    const employmentStatus = formData.get('employment_status') as any;
    const occupation = formData.get('occupation') as string;
    const address = formData.get('address') as string;
    const studentIdStr = formData.get('student_id') as string;
    const studentId = studentIdStr ? parseInt(studentIdStr, 10) : undefined;
    const expertiseField = formData.get('expertise_field') as string;
    const certification = formData.get('certification') as string;
    const appointmentDate = formData.get('appointment_date') as string;

    try {
      if (actionType === 'delete') {
        await deleteUserAccount(parseInt(userId, 10));
        redirect('/dashboard/admin?tab=staff&success=Akun berhasil dihapus');
      } else if (userId) {
        await updateUserAccount(parseInt(userId, 10), {
          name, email, password: password || undefined, phone, role,
          nuptk, nip, employment_status: employmentStatus, occupation, address, student_id: studentId,
          expertise_field: expertiseField, certification: certification, appointment_date: appointmentDate
        });
        redirect('/dashboard/admin?tab=staff&success=Akun berhasil diperbarui');
      } else {
        await createUserAccount({
          name, email, password, phone, role,
          nuptk, nip, employment_status: employmentStatus, occupation, address, student_id: studentId,
          expertise_field: expertiseField, certification: certification, appointment_date: appointmentDate
        });
        redirect('/dashboard/admin?tab=staff&success=Akun berhasil dibuat');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=staff&error=${encodeURIComponent(err.message || 'Gagal menyimpan akun')}`);
    }
  }

  async function handleStaffAttendanceSave(formData: FormData) {
    'use server';
    const date = formData.get('date') as string;
    const userIds = formData.getAll('user_ids').map(id => parseInt(id as string, 10));
    
    const records = userIds.map(userId => {
      const status = formData.get(`status_${userId}`) as any;
      const notes = formData.get(`notes_${userId}`) as string;
      return { userId, status, notes };
    });

    try {
      await recordStaffAttendance(session!.userId, date, records);
      redirect(`/dashboard/admin?tab=attendance&date=${date}&success=Absensi staf berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=attendance&date=${date}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
    }
  }

  // --- SERVER ACTIONS FOR ANNOUNCEMENTS & SCHOOL EVENTS ---

  async function handleAnnouncement(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const annId = formData.get('annId') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;

    try {
      if (actionType === 'delete') {
        await pool.query('DELETE FROM announcements WHERE id = ?', [parseInt(annId, 10)]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus pengumuman`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Pengumuman berhasil dihapus');
      } else if (annId) {
        await pool.query('UPDATE announcements SET title = ?, content = ? WHERE id = ?', [title, content, parseInt(annId, 10)]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memperbarui pengumuman: ${title}`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Pengumuman berhasil diperbarui');
      } else {
        await pool.query('INSERT INTO announcements (title, content, created_by) VALUES (?, ?, ?)', [title, content, session!.userId]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menambahkan pengumuman: ${title}`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Pengumuman berhasil ditambahkan');
      }
    } catch (err: any) {
      if (isRedirectError(err)) throw err;
      redirect(`/dashboard/admin?error=${encodeURIComponent(err.message || 'Gagal menyimpan pengumuman')}`);
    }
  }

  async function handleSchoolEvent(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const evId = formData.get('evId') as string;
    const title = formData.get('title') as string;
    const eventDate = formData.get('event_date') as string;
    const endDate = formData.get('end_date') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;

    try {
      if (actionType === 'delete') {
        await pool.query('DELETE FROM school_events WHERE id = ?', [parseInt(evId, 10)]);
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menghapus event kalender`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Event kalender berhasil dihapus');
      } else if (evId) {
        await pool.query(
          'UPDATE school_events SET title = ?, event_date = ?, end_date = ?, category = ?, description = ? WHERE id = ?',
          [title, eventDate, endDate || null, category, description, parseInt(evId, 10)]
        );
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Memperbarui event: ${title}`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Event kalender berhasil diperbarui');
      } else {
        await pool.query(
          'INSERT INTO school_events (title, event_date, end_date, category, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [title, eventDate, endDate || null, category, description, session!.userId]
        );
        await pool.query(
          'INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES (?, ?, ?, ?)',
          [session!.userId, session!.name, `Menambahkan event: ${title}`, 'Sistem']
        );
        redirect('/dashboard/admin?success=Event kalender berhasil ditambahkan');
      }
    } catch (err: any) {
      if (isRedirectError(err)) throw err;
      redirect(`/dashboard/admin?error=${encodeURIComponent(err.message || 'Gagal menyimpan event')}`);
    }
  }

  // --- FETCH DATA FOR ACTIVE TAB ---

  let overviewData = null;
  let classes = [];
  let subjects = [];
  let periods = [];
  let extracurriculars = [];
  let students = [];
  let totalStudentsCount = 0;
  let detailStudent: any = null;
  let detailStudentGrades: any[] = [];
  let detailStudentAttSummary = { present: 0, sick: 0, permission: 0, absent: 0, late: 0 };
  let detailEkskul: any = null;
  let detailEkskulMembers: any[] = [];
  let detailSubject: any = null;
  let detailSubjectAssignments: any[] = [];
  let classSchedules: any[] = [];
  let editSchedule: any = null;
  let calendarEvents: any[] = [];
  let editCalendarEvent: any = null;
  let viewCalendarPeriod: any = null;
  let viewCalendarPeriods: any[] = [];
  let detailClass: any = null;
  let detailClassStudents: any[] = [];
  let unassignedStudents: any[] = [];
  let editClassItem: any = null;
  
  // Staff accounts
  let teachers = [];
  let coaches = [];
  let parents = [];
  let principal = null;

  // Attendance
  let staffAttendance = null;
  let staffAttendanceHistory: any[] = [];
  let allStaffForFilter: any[] = [];

  const [teachersList] = (await pool.query('SELECT u.id, u.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = "teacher"')) as any;
  const [coachesList] = (await pool.query('SELECT u.id, u.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = "coach"')) as any;
  
  // Overview extra data
  let announcements: any[] = [];
  let schoolEvents: any[] = [];
  let activityLogs: any[] = [];
  let weeklyAttendanceTrend: any[] = [];
  let editAnnouncement: any = null;
  let editEvent: any = null;

  if (tab === 'overview') {
    const [cCount] = (await pool.query('SELECT COUNT(*) as count FROM classes')) as any;
    const [sCount] = (await pool.query('SELECT COUNT(*) as count FROM student_profiles WHERE is_active = TRUE')) as any;
    const [staffCount] = (await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('teacher','coach','principal')
    `)) as any;
    // Today's staff attendance: count present today
    const [presentToday] = (await pool.query(`
      SELECT COUNT(*) as count
      FROM attendance_records ar
      JOIN attendance_sessions asess ON ar.session_id = asess.id
      WHERE asess.session_type = 'staff' AND asess.class_id IS NULL
        AND asess.session_date = ? AND ar.status = 'present'
    `, [today])) as any;
    const [totalStaffForAtt] = (await pool.query(`
      SELECT COUNT(DISTINCT u.id) as count FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('teacher','coach')
    `)) as any;

    overviewData = {
      classes: cCount[0].count,
      students: sCount[0].count,
      staff: staffCount[0].count,
      presentToday: presentToday[0].count,
      totalStaffForAtt: totalStaffForAtt[0].count,
    };

    // Weekly attendance trend (last 7 days) - student attendance
    const [trendRows] = (await pool.query(`
      SELECT 
        asess.session_date,
        COUNT(ar.id) as total,
        SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count
      FROM attendance_sessions asess
      LEFT JOIN attendance_records ar ON ar.session_id = asess.id AND ar.student_id IS NOT NULL
      WHERE asess.session_type IN ('daily','subject')
        AND asess.session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY asess.session_date
      ORDER BY asess.session_date ASC
    `)) as any;
    weeklyAttendanceTrend = trendRows as any[];

    // Announcements
    const [annRows] = (await pool.query('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5')) as any;
    announcements = annRows as any[];
    if (announcementEditId) {
      editAnnouncement = announcements.find((a: any) => a.id === announcementEditId) ||
        (await pool.query('SELECT * FROM announcements WHERE id = ?', [announcementEditId]) as any)[0][0] || null;
    }

    // School events (upcoming: next 60 days)
    const [evRows] = (await pool.query(`
      SELECT * FROM school_events
      WHERE event_date >= CURDATE()
      ORDER BY event_date ASC
      LIMIT 10
    `)) as any;
    schoolEvents = evRows as any[];
    if (eventEditId) {
      editEvent = schoolEvents.find((e: any) => e.id === eventEditId) ||
        (await pool.query('SELECT * FROM school_events WHERE id = ?', [eventEditId]) as any)[0][0] || null;
    }

    // Activity logs
    const [logRows] = (await pool.query('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8')) as any;
    activityLogs = logRows as any[];

  } else if (tab === 'classes') {
    // Fetch classes with homeroom teacher name and student count
    let query = `
      SELECT c.id, c.name, c.grade_level, c.homeroom_teacher_id, c.is_active, 
             u.name as homeroom_teacher_name, u.avatar as homeroom_teacher_avatar,
             (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
    `;
    const params: any[] = [];
    if (classGrade !== 'Semua') {
      query += ` WHERE c.grade_level = ?`;
      params.push(parseInt(classGrade, 10));
    }
    query += ` ORDER BY c.grade_level ASC, c.name ASC`;
    const [cRows] = await pool.query(query, params) as any[];
    classes = cRows;

    if (detailClassId) {
      const [dcRows] = await pool.query(`
        SELECT c.id, c.name, c.grade_level, c.homeroom_teacher_id, c.is_active, 
               u.name as homeroom_teacher_name 
        FROM classes c 
        LEFT JOIN users u ON c.homeroom_teacher_id = u.id 
        WHERE c.id = ?
      `, [detailClassId]) as any[];
      if (dcRows.length > 0) {
        detailClass = dcRows[0];
        
        // Fetch students in this class
        const [studRows] = await pool.query(`
          SELECT id, nis, nisn, full_name, gender, is_active 
          FROM student_profiles 
          WHERE class_id = ? 
          ORDER BY full_name ASC
        `, [detailClassId]) as any[];
        detailClassStudents = studRows;

        // Fetch unassigned students (students without a class)
        const [unassignedRows] = await pool.query(`
          SELECT id, full_name, nisn 
          FROM student_profiles 
          WHERE class_id IS NULL
          ORDER BY full_name ASC
        `) as any[];
        unassignedStudents = unassignedRows;
      }
    }

    if (classEditId) {
      const [ecRows] = await pool.query('SELECT * FROM classes WHERE id = ?', [classEditId]) as any[];
      if (ecRows.length > 0) {
        editClassItem = ecRows[0];
      }
    }
  } else if (tab === 'subjects') {
    // Fetch all academic subjects (filtered to exclude extracurriculars)
    let query = `
      SELECT s.*, 
             (SELECT COUNT(DISTINCT ts.teacher_id) FROM teacher_subjects ts WHERE ts.subject_id = s.id) as teacher_count
      FROM subjects s
      WHERE s.is_core = TRUE
    `;
    const params: any[] = [];
    
    if (subSearch) {
      query += ` AND (s.name LIKE ? OR s.code LIKE ?)`;
      params.push(`%${subSearch}%`, `%${subSearch}%`);
    }
    if (subClass !== 'Semua') {
      // Filter subjects that match the grade level of the selected class (e.g. '1' for '1A')
      const gradeChar = subClass.charAt(0);
      query += ` AND FIND_IN_SET(?, s.grade_level)`;
      params.push(gradeChar);
    }
    if (subCategory !== 'Semua') {
      query += ` AND s.category = ?`;
      params.push(subCategory);
    }
    
    query += ` ORDER BY s.name ASC`;
    const [rows] = await pool.query(query, params) as any[];
    subjects = rows;

    // Fetch all classes for class selection dropdown and filters
    const [cRows] = await pool.query(`
      SELECT id, name, grade_level FROM classes 
      ORDER BY grade_level ASC, name ASC
    `) as any[];
    classes = cRows;

    // Fetch teachers assignments for all subjects to show names on the cards
    const [allAss] = await pool.query(`
      SELECT ts.subject_id, u.name as teacher_name, u.id as teacher_id
      FROM teacher_subjects ts
      JOIN users u ON ts.teacher_id = u.id
    `) as any[];
    // We will attach teacher names to subjects
    subjects = subjects.map((sub: any) => {
      const assigned = allAss.filter((a: any) => a.subject_id === sub.id);
      return {
        ...sub,
        teachers: Array.from(new Set(assigned.map((a: any) => a.teacher_name))),
        teacher_ids: Array.from(new Set(assigned.map((a: any) => a.teacher_id)))
      };
    });

    if (subClass !== 'Semua') {
      // Fetch schedules for the specific class
      const [schedulesRows] = await pool.query(`
        SELECT cs.*, s.name as subject_name, s.code as subject_code, u.name as teacher_name
        FROM class_schedules cs
        JOIN subjects s ON cs.subject_id = s.id
        JOIN users u ON cs.teacher_id = u.id
        JOIN classes c ON cs.class_id = c.id
        WHERE c.name = ?
        ORDER BY FIELD(cs.day_name, 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'), cs.start_time ASC
      `, [subClass]) as any[];
      classSchedules = schedulesRows;
    }

    if (scheduleEditId) {
      const [editSchedRows] = await pool.query(`
        SELECT cs.*, c.name as class_name 
        FROM class_schedules cs
        JOIN classes c ON cs.class_id = c.id
        WHERE cs.id = ?
      `, [scheduleEditId]) as any[];
      if (editSchedRows.length > 0) {
        editSchedule = editSchedRows[0];
      }
    }

    if (detailSubjectId) {
      const [sRows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [detailSubjectId]) as any[];
      if (sRows.length > 0) {
        detailSubject = sRows[0];
        
        // Fetch specific assignments
        const [aRows] = await pool.query(`
          SELECT ts.id as assignment_id, ts.class_id, ts.teacher_id, c.name as class_name, u.name as teacher_name
          FROM teacher_subjects ts
          JOIN classes c ON ts.class_id = c.id
          JOIN users u ON ts.teacher_id = u.id
          WHERE ts.subject_id = ?
          ORDER BY c.grade_level ASC, c.name ASC
        `, [detailSubjectId]) as any[];
        detailSubjectAssignments = aRows;
      }
    }
  } else if (tab === 'periods') {
    periods = await getAcademicPeriods();

    if (viewCalendarPeriodId) {
      const [pRows] = await pool.query('SELECT * FROM academic_periods WHERE id = ?', [viewCalendarPeriodId]) as any[];
      if (pRows.length > 0) {
        viewCalendarPeriod = pRows[0];
        
        // Find academic year (e.g., '2024/2025') from the period name
        const yearPrefix = viewCalendarPeriod.name.substring(0, 9);
        
        // Fetch all semesters under this academic year
        const [semRows] = await pool.query(`
          SELECT * FROM academic_periods 
          WHERE name LIKE ? 
          ORDER BY name ASC
        `, [`${yearPrefix}%`]) as any[];
        viewCalendarPeriods = semRows;

        // Fetch all events / holidays for this academic year
        const [evRows] = await pool.query(`
          SELECT ace.*, ap.name as period_name 
          FROM academic_calendar_events ace
          JOIN academic_periods ap ON ace.period_id = ap.id
          WHERE ace.period_id IN (
            SELECT id FROM academic_periods WHERE name LIKE ?
          )
          ORDER BY ace.start_date ASC
        `, [`${yearPrefix}%`]) as any[];
        calendarEvents = evRows;
      }
    }

    if (calendarEventEditId) {
      const [editEvRows] = await pool.query('SELECT * FROM academic_calendar_events WHERE id = ?', [calendarEventEditId]) as any[];
      if (editEvRows.length > 0) {
        editCalendarEvent = editEvRows[0];
      }
    }
  } else if (tab === 'ekskuls') {
    const [rows] = await pool.query(`
      SELECT e.*, u.name as coach_name, 
             (SELECT COUNT(*) FROM ekskul_members WHERE extracurricular_id = e.id) as enrolled_count
      FROM extracurriculars e
      JOIN users u ON e.coach_id = u.id
      ORDER BY e.name ASC
    `) as any[];
    extracurriculars = rows;

    if (detailEkskulId) {
      const [eRows] = await pool.query(`
        SELECT e.*, u.name as coach_name
        FROM extracurriculars e
        JOIN users u ON e.coach_id = u.id
        WHERE e.id = ?
      `, [detailEkskulId]) as any[];
      if (eRows.length > 0) {
        detailEkskul = eRows[0];
        const [mRows] = await pool.query(`
          SELECT em.progress_level, em.attendance_rate, sp.full_name as student_name, sp.nis, sp.nisn, c.name as class_name, sp.id as student_id
          FROM ekskul_members em
          JOIN student_profiles sp ON em.student_id = sp.id
          JOIN classes c ON sp.class_id = c.id
          WHERE em.extracurricular_id = ?
          ORDER BY sp.full_name ASC
        `, [detailEkskulId]) as any[];
        detailEkskulMembers = mRows;
      }
    }
  } else if (tab === 'students') {
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (stuSearch) {
      conditions.push('(s.full_name LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)');
      const likeVal = `%${stuSearch}%`;
      queryParams.push(likeVal, likeVal, likeVal);
    }
    if (stuGrade) {
      conditions.push('c.grade_level = ?');
      queryParams.push(parseInt(stuGrade, 10));
    }
    if (stuStatus === 'active') {
      conditions.push('s.is_active = TRUE');
    } else if (stuStatus === 'inactive') {
      conditions.push('s.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRes] = await pool.query(`
      SELECT COUNT(*) as count 
      FROM student_profiles s 
      JOIN classes c ON s.class_id = c.id
      ${whereClause}
    `, queryParams) as any[];
    totalStudentsCount = countRes[0].count;

    const [studentRows] = await pool.query(`
      SELECT 
        s.id, 
        s.nis, 
        s.nisn, 
        s.full_name, 
        s.class_id, 
        s.gender, 
        s.birth_date, 
        s.address, 
        s.parent_phone, 
        s.is_active, 
        c.name as class_name,
        c.grade_level,
        (SELECT ROUND(AVG(score), 1) FROM grades WHERE student_id = s.id) as avg_grade,
        (
          SELECT ar.status 
          FROM attendance_records ar
          JOIN attendance_sessions asess ON ar.session_id = asess.id
          WHERE ar.student_id = s.id
          ORDER BY asess.session_date DESC, asess.id DESC
          LIMIT 1
        ) as latest_attendance_status
      FROM student_profiles s
      JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY c.grade_level ASC, c.name ASC, s.full_name ASC
      LIMIT ? OFFSET ?
    `, [...queryParams, stuLimit, stuOffset]) as any[];
    
    students = studentRows;
    classes = await getClasses();

    // Query detail student if requested
    if (detailStudentId) {
      const [dRows] = await pool.query(`
        SELECT s.*, c.name as class_name, c.grade_level 
        FROM student_profiles s
        JOIN classes c ON s.class_id = c.id
        WHERE s.id = ?
      `, [parseInt(detailStudentId, 10)]) as any[];
      
      if (dRows.length > 0) {
        detailStudent = dRows[0];
        
        const [gRows] = await pool.query(`
          SELECT g.score, g.type, sub.name as subject_name, sub.code as subject_code
          FROM grades g
          JOIN subjects sub ON g.subject_id = sub.id
          WHERE g.student_id = ?
        `, [detailStudent.id]) as any[];
        detailStudentGrades = gRows;

        const [aRows] = await pool.query(`
          SELECT status, COUNT(*) as count 
          FROM attendance_records 
          WHERE student_id = ? 
          GROUP BY status
        `, [detailStudent.id]) as any[];
        
        for (const stat of aRows) {
          if (stat.status in detailStudentAttSummary) {
            detailStudentAttSummary[stat.status as keyof typeof detailStudentAttSummary] = stat.count;
          }
        }
      }
    }
  } else if (tab === 'staff') {
    teachers = await getTeacherProfiles();
    coaches = await getCoachProfiles();
    parents = await getParentProfiles();
    principal = await getPrincipalProfile();
    const [stuRaw] = await pool.query('SELECT id, full_name, nis FROM student_profiles WHERE is_active = TRUE ORDER BY full_name ASC');
    students = stuRaw as any[];
  } else if (tab === 'attendance') {
    staffAttendanceHistory = await getStaffAttendanceHistory(attStartDate, attEndDate, attFilterUserId, attFilterRole || null);
    const [staffRaw] = (await pool.query(`
      SELECT u.id, u.name, r.name as role_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name IN ('teacher', 'coach')
      ORDER BY r.name ASC, u.name ASC
    `)) as any;
    allStaffForFilter = staffRaw as any[];
  }

  // --- HELPERS FOR EDITING ---
  let editItem: any = null;
  if (editId) {
    const id = parseInt(editId, 10);
    if (tab === 'classes') editItem = classes.find((c: any) => c.id === id);
    if (tab === 'subjects') editItem = subjects.find((s: any) => s.id === id);
    if (tab === 'periods') editItem = periods.find((p: any) => p.id === id);
    if (tab === 'students') editItem = students.find((s: any) => s.id === id);
    if (tab === 'staff') {
      editItem = teachers.find(t => t.user_id === id) || 
                 coaches.find(c => c.user_id === id) || 
                 parents.find(p => p.user_id === id) || 
                 (principal && principal.user_id === id ? principal : null);
    }
  }

  if (tab === 'periods' && periodEditId) {
    editItem = periods.find((p: any) => p.id === periodEditId);
  }

  if (tab === 'subjects' && subjectEditId) {
    editItem = subjects.find((s: any) => s.id === subjectEditId);
  }

  if (tab === 'ekskuls') {
    if (editId) editItem = extracurriculars.find((e: any) => e.id === parseInt(editId, 10));
    else if (ekskulEditId && ekskulEditId !== 'new') editItem = extracurriculars.find((e: any) => e.id === parseInt(ekskulEditId, 10));
  }

  const scheduleDayStr = (tab === 'ekskuls' && editItem) ? (editItem.schedule_day || '') : '';
  const timeParts = (tab === 'ekskuls' && editItem && editItem.schedule_time) ? editItem.schedule_time.split(' - ') : [];
  const startTimeVal = timeParts[0] || '14:00';
  const endTimeVal = timeParts[1] || '16:00';
  const isEkskulEdit = ekskulEditId !== 'new';

  // Group periods by academic year
  const yearsMap: { [key: string]: any[] } = {};
  periods.forEach((p: any) => {
    if (!yearsMap[p.academic_year]) {
      yearsMap[p.academic_year] = [];
    }
    yearsMap[p.academic_year].push(p);
  });
  // Sort years descending
  const academicYears = Object.keys(yearsMap).sort((a, b) => b.localeCompare(a));

  // Find active period
  const activePeriod = periods.find((p: any) => p.is_active);

  // Helper date formatter
  const formatIndoDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatIndoDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return '—';
    if (!start) return formatIndoDate(end);
    if (!end) return formatIndoDate(start);
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Check if same month
    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`;
    }
    return `${startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {successMsg && <Toast message={decodeURIComponent(successMsg)} type="success" />}
      {errorMsg && <Toast message={decodeURIComponent(errorMsg)} type="error" />}

      {/* --- DASHBOARD PANEL --- */}
      {tab === 'overview' && overviewData && (() => {
        // Helpers for chart
        const maxTrend = Math.max(...weeklyAttendanceTrend.map((d: any) => Number(d.total) || 0), 1);
        const attendancePct = overviewData.totalStaffForAtt > 0
          ? Math.round((overviewData.presentToday / overviewData.totalStaffForAtt) * 100)
          : 0;
        const now = new Date();
        const todayStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        // Category colors for events
        const eventCategoryStyle: Record<string, string> = {
          'Akademik': 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
          'Libur':    'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
          'Kegiatan': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
          'Ujian':    'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
          'Lainnya':  'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
        };
        const actCategoryStyle: Record<string, string> = {
          'Akademik':   'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
          'Absensi':    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
          'Data Siswa': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400',
          'Sistem':     'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
          'Ekskul':     'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400',
        };

        const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const fmtRelTime = (d: string | Date) => {
          const diff = Date.now() - new Date(d).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 60) return `${mins} menit lalu`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs} jam lalu`;
          return `${Math.floor(hrs / 24)} hari lalu`;
        };

        return (
          <div className="flex flex-col gap-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
              <p className="text-indigo-200 text-sm mb-1">{todayStr}</p>
              <h2 className="text-2xl font-bold">Selamat Datang, {session!.name} 👋</h2>
              <p className="text-indigo-200 text-sm mt-1">Berikut adalah ringkasan operasional sekolah hari ini.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Siswa', value: overviewData.students.toLocaleString('id-ID'),
                  sub: 'siswa aktif', icon: Users,
                  iconBg: 'bg-indigo-50 dark:bg-indigo-950/30', iconColor: 'text-indigo-600 dark:text-indigo-400',
                  accent: 'border-l-4 border-l-indigo-500',
                },
                {
                  label: 'Total Guru & Staf', value: overviewData.staff,
                  sub: 'termasuk coach & kepsek', icon: GraduationCap,
                  iconBg: 'bg-emerald-50 dark:bg-emerald-950/30', iconColor: 'text-emerald-600 dark:text-emerald-400',
                  accent: 'border-l-4 border-l-emerald-500',
                },
                {
                  label: 'Kehadiran Staf', value: `${attendancePct}%`,
                  sub: `${overviewData.presentToday} dari ${overviewData.totalStaffForAtt} hadir hari ini`, icon: CheckSquare,
                  iconBg: 'bg-amber-50 dark:bg-amber-950/30', iconColor: 'text-amber-600 dark:text-amber-400',
                  accent: 'border-l-4 border-l-amber-500',
                },
                {
                  label: 'Ruang Kelas', value: overviewData.classes,
                  sub: 'kelas aktif', icon: BookOpen,
                  iconBg: 'bg-purple-50 dark:bg-purple-950/30', iconColor: 'text-purple-600 dark:text-purple-400',
                  accent: 'border-l-4 border-l-purple-500',
                },
              ].map(card => (
                <div key={card.label} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 ${card.accent}`}>
                  <div className={`p-3 rounded-xl ${card.iconBg} ${card.iconColor} shrink-0`}>
                    <card.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-xs font-semibold uppercase truncate">{card.label}</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{card.value}</p>
                    <p className="text-zinc-400 text-xs truncate">{card.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main 2-column Grid */}
            <div className="grid lg:grid-cols-5 gap-6 items-start">
              {/* LEFT: Chart + Activity */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                {/* Weekly Attendance Trend */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-zinc-900 dark:text-white text-base">Tren Kehadiran Mingguan</h3>
                      <p className="text-xs text-zinc-400">Sesi absensi siswa 7 hari terakhir</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                  </div>
                  {weeklyAttendanceTrend.length > 0 ? (
                    <div className="flex items-end gap-2 h-36">
                      {weeklyAttendanceTrend.map((d: any, i: number) => {
                        const total = Number(d.total) || 0;
                        const present = Number(d.present_count) || 0;
                        const heightPct = maxTrend > 0 ? Math.round((total / maxTrend) * 100) : 0;
                        const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;
                        const dayLabel = new Date(d.session_date).toLocaleDateString('id-ID', { weekday: 'short' });
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                            <div className="relative w-full flex flex-col items-center">
                              <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{total} sesi</span>
                              <div className="w-full rounded-t-lg bg-indigo-100 dark:bg-indigo-950/40 overflow-hidden" style={{ height: `${Math.max(heightPct, 8)}px`, maxHeight: '100px' }}>
                                <div
                                  className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-lg transition-all"
                                  style={{ height: `${presentPct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-400">{dayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-36 flex flex-col items-center justify-center text-zinc-400">
                      <TrendingUp className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Belum ada data absensi minggu ini</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />Hadir</span>
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2 w-2 rounded-full bg-indigo-100 dark:bg-indigo-950/40 inline-block border border-indigo-300" />Total Sesi</span>
                  </div>
                </div>

                {/* Activity Log */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500" />
                    <h3 className="font-bold text-zinc-900 dark:text-white text-base">Aktivitas Terbaru</h3>
                  </div>
                  {activityLogs.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-sm">Belum ada aktivitas tercatat.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {activityLogs.map((log: any) => (
                        <div key={log.id} className="px-6 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {(log.user_name || 'S').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{log.user_name || 'Sistem'}</p>
                            <p className="text-xs text-zinc-500 truncate">{log.activity}</p>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${actCategoryStyle[log.category] || actCategoryStyle['Sistem']}`}>{log.category}</span>
                            <span className="text-[10px] text-zinc-400">{fmtRelTime(log.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Announcements + Calendar */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Announcements CRUD */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-bold text-zinc-900 dark:text-white text-base">Pengumuman</h3>
                    </div>
                    <Link href="/dashboard/admin?announcementEditId=new" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Tambah
                    </Link>
                  </div>

                  {/* Add/Edit Form */}
                  {(announcementEditId !== null) && (
                    <div className="px-5 py-4 bg-indigo-50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/50">
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase">
                        {editAnnouncement ? 'Edit Pengumuman' : 'Pengumuman Baru'}
                      </p>
                      <form action={handleAnnouncement} className="flex flex-col gap-2">
                        {editAnnouncement && <input type="hidden" name="annId" value={editAnnouncement.id} />}
                        <input
                          type="text" name="title" required
                          defaultValue={editAnnouncement?.title || ''}
                          placeholder="Judul pengumuman..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <textarea
                          name="content" rows={3}
                          defaultValue={editAnnouncement?.content || ''}
                          placeholder="Isi pengumuman..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                            {editAnnouncement ? 'Simpan' : 'Buat'}
                          </button>
                          <Link href="/dashboard/admin" className="flex-1 py-1.5 text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-lg">
                            Batal
                          </Link>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* List */}
                  {announcements.length === 0 ? (
                    <div className="px-6 py-8 text-center text-zinc-400 text-sm">Belum ada pengumuman.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {announcements.map((ann: any) => (
                        <div key={ann.id} className="px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{ann.title}</p>
                              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{ann.content}</p>
                              <p className="text-[10px] text-zinc-400 mt-1">{fmtDate(ann.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Link href={`/dashboard/admin?announcementEditId=${ann.id}`} className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                                <Edit2 className="h-3 w-3" />
                              </Link>
                              <DeleteButton action={handleAnnouncement} confirmMessage={`Yakin hapus pengumuman "${ann.title}"?`}>
                                <input type="hidden" name="actionType" value="delete" />
                                <input type="hidden" name="annId" value={ann.id} />
                              </DeleteButton>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* School Calendar / Events CRUD */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-emerald-500" />
                      <h3 className="font-bold text-zinc-900 dark:text-white text-base">Kalender Pendidikan</h3>
                    </div>
                    <Link href="/dashboard/admin?eventEditId=new" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Tambah
                    </Link>
                  </div>

                  {/* Add/Edit Event Form */}
                  {(eventEditId !== null) && (
                    <div className="px-5 py-4 bg-emerald-50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/50">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase">
                        {editEvent ? 'Edit Event' : 'Event Baru'}
                      </p>
                      <form action={handleSchoolEvent} className="flex flex-col gap-2">
                        {editEvent && <input type="hidden" name="evId" value={editEvent.id} />}
                        <input
                          type="text" name="title" required
                          defaultValue={editEvent?.title || ''}
                          placeholder="Nama event..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Tanggal Mulai *</label>
                            <input type="date" name="event_date" required
                              defaultValue={editEvent?.event_date ? new Date(editEvent.event_date).toISOString().split('T')[0] : ''}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5">Tanggal Selesai</label>
                            <input type="date" name="end_date"
                              defaultValue={editEvent?.end_date ? new Date(editEvent.end_date).toISOString().split('T')[0] : ''}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                          </div>
                        </div>
                        <select name="category" defaultValue={editEvent?.category || 'Kegiatan'}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                          <option value="Akademik">Akademik</option>
                          <option value="Libur">Libur</option>
                          <option value="Kegiatan">Kegiatan</option>
                          <option value="Ujian">Ujian</option>
                          <option value="Lainnya">Lainnya</option>
                        </select>
                        <textarea name="description" rows={2}
                          defaultValue={editEvent?.description || ''}
                          placeholder="Deskripsi (opsional)..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                            {editEvent ? 'Simpan' : 'Buat'}
                          </button>
                          <Link href="/dashboard/admin" className="flex-1 py-1.5 text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-lg">
                            Batal
                          </Link>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Agenda List */}
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-bold uppercase text-zinc-400 mb-2">Agenda Mendatang</p>
                    {schoolEvents.length === 0 ? (
                      <p className="text-sm text-zinc-400 py-4 text-center">Belum ada agenda mendatang.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {schoolEvents.map((ev: any) => {
                          const evDate = new Date(ev.event_date);
                          return (
                            <div key={ev.id} className="flex items-start gap-3 group">
                              <div className={`shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center ${eventCategoryStyle[ev.category] || eventCategoryStyle['Lainnya']}`}>
                                <span className="text-[10px] font-bold leading-none">{evDate.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()}</span>
                                <span className="text-base font-extrabold leading-tight">{evDate.getDate()}</span>
                              </div>
                              <div className="flex-1 min-w-0 pt-0.5">
                                <p className="text-sm font-semibold text-zinc-800 dark:text-white truncate">{ev.title}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${eventCategoryStyle[ev.category] || eventCategoryStyle['Lainnya']}`}>{ev.category}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <Link href={`/dashboard/admin?eventEditId=${ev.id}`} className="p-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                                  <Edit2 className="h-3 w-3" />
                                </Link>
                                <DeleteButton action={handleSchoolEvent} confirmMessage={`Yakin hapus event "${ev.title}"?`}>
                                  <input type="hidden" name="actionType" value="delete" />
                                  <input type="hidden" name="evId" value={ev.id} />
                                </DeleteButton>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- CLASSES TAB --- */}
      {tab === 'classes' && (
        <div className="flex flex-col gap-6">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Manajemen Kelas</h2>
              <p className="text-xs text-zinc-500">Kelola dan pantau aktivitas seluruh jenjang kelas di SD Maju Jaya.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin?tab=classes&classNew=true"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Tambah Kelas Baru
              </Link>
              <a
                href="/api/classes/export"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Ekspor CSV
              </a>
              <a
                href="/api/classes/print"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </a>
            </div>
          </div>

          {!classNew && !classEditId && !detailClassId && (
            <>
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Stat 1: Total Classes */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-blue-500">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Kelas</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{classes.length}</p>
                    <p className="text-zinc-400 text-[10px] mt-1">aktif di sekolah</p>
                  </div>
                </div>

                {/* Stat 2: Total Students */}
                {(() => {
                  const totalStudents = classes.reduce((sum: number, c: any) => sum + (c.student_count || 0), 0);
                  const avgPerClass = classes.length > 0 ? Math.round(totalStudents / classes.length) : 0;
                  return (
                    <>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 shrink-0">
                          <Users className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Siswa Terdaftar</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{totalStudents}</p>
                          <p className="text-emerald-650 text-[10px] font-semibold mt-1">siswa aktif</p>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-purple-500">
                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 shrink-0">
                          <Activity className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Rata-rata Siswa / Kelas</p>
                          <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{avgPerClass}</p>
                          <p className="text-purple-600 text-[10px] font-semibold mt-1">kapasitas ideal 30</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Pills Filter */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
                <span className="text-xs font-bold text-zinc-400 mr-2 shrink-0">Filter Tingkat:</span>
                {['Semua', '1', '2', '3', '4', '5', '6'].map((g) => (
                  <Link
                    key={g}
                    href={`/dashboard/admin?tab=classes&classGrade=${g}`}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      classGrade === g
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {g === 'Semua' ? 'All Classes' : `Grade ${g}`}
                  </Link>
                ))}
              </div>

              {/* Classes Grid Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {classes.map((c: any) => {
                  const studentCount = c.student_count || 0;
                  const isFull = studentCount >= 30;
                  // Format name e.g. 1A -> Kelas 1-A
                  const formattedName = c.name.replace(/(\d+)([A-Z]+)/, 'Kelas $1-$2');
                  
                  // Homeroom initials and color
                  const homeroomName = c.homeroom_teacher_name || 'Belum Ditentukan';
                  const initials = homeroomName !== 'Belum Ditentukan'
                    ? homeroomName.replace(/^(Ibu|Bpk\.)\s+/, '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    : '??';
                  
                  return (
                    <div key={c.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="p-6 space-y-4">
                        {/* Title & Badge */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-zinc-900 dark:text-white">{formattedName}</h3>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isFull
                              ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30'
                          }`}>
                            {isFull ? 'Penuh' : 'Aktif'}
                          </span>
                        </div>

                        {/* Wali Kelas Card */}
                        <div className="flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-850 p-3 rounded-xl">
                          <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">Wali Kelas</span>
                            <span className="text-xs font-black text-zinc-800 dark:text-white truncate block">{homeroomName}</span>
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                            <span>{studentCount} Siswa</span>
                            <span>{studentCount}/30 Kapasitas</span>
                          </div>
                          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${Math.min((studentCount / 30) * 100, 100)}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
                        <Link
                          href={`/dashboard/admin?tab=classes&detailClassId=${c.id}`}
                          className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold"
                        >
                          Detail Kelas
                        </Link>
                        
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admin?tab=classes&classEditId=${c.id}`}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-550 dark:text-zinc-450 rounded-xl"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <DeleteButton action={handleClass} confirmMessage="Yakin ingin menghapus kelas ini beserta seluruh jadwal pelajarannya?">
                            <input type="hidden" name="actionType" value="delete" />
                            <input type="hidden" name="classId" value={c.id} />
                          </DeleteButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* STATE 1: CREATE / EDIT CLASS FORM */}
          {(classNew || classEditId) && (
            <form action={handleClass} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs max-w-xl mx-auto w-full">
              {classEditId && <input type="hidden" name="classId" value={editClassItem?.id} />}
              
              {/* Form Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    {classEditId ? 'Edit Detail Kelas' : 'Tambah Kelas Baru'}
                  </h3>
                  <p className="text-xs text-zinc-500">Tentukan nama, tingkatan, dan guru wali kelas yang bertanggung jawab.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/admin?tab=classes"
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simpan Kelas
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Kelas *</label>
                  <input
                    type="text" name="name" required
                    defaultValue={editClassItem?.name || ''}
                    placeholder="Contoh: 1A, 1B, 4A, 6B"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Tingkat Kelas (Grade Level) *</label>
                  <select
                    name="grade_level" required
                    defaultValue={editClassItem?.grade_level || '1'}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>Kelas {g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Pilih Guru Wali Kelas</label>
                  <select
                    name="homeroom_teacher_id"
                    defaultValue={editClassItem?.homeroom_teacher_id || ''}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  >
                    <option value="">-- Tanpa Wali Kelas --</option>
                    {(teachersList as any[]).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          )}

          {/* STATE 2: DETAIL CLASS & STUDENTS MEMBERSHIP */}
          {detailClassId && detailClass && (
            <div className="flex flex-col gap-6">
              {/* Back Link */}
              <Link 
                href="/dashboard/admin?tab=classes"
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Manajemen Kelas
              </Link>

              {/* Grid content */}
              <div className="grid lg:grid-cols-3 gap-6 items-start">
                
                {/* Student list table (Left 2 cols) */}
                <div className="lg:col-span-2 flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-6 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                        Anggota Kelas {detailClass.name.replace(/(\d+)([A-Z]+)/, '$1-$2')}
                      </h3>
                      <p className="text-xs text-zinc-500">Total {detailClassStudents.length} siswa terdaftar di kelas ini.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-650 dark:text-zinc-400">
                      <thead className="bg-zinc-550/5 dark:bg-zinc-950/20 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-150 dark:border-zinc-850">
                        <tr>
                          <th className="px-6 py-4">NIS</th>
                          <th className="px-6 py-4">NISN</th>
                          <th className="px-6 py-4">Nama Lengkap</th>
                          <th className="px-6 py-4">Gender</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                        {detailClassStudents.length > 0 ? (
                          detailClassStudents.map((stud: any) => (
                            <tr key={stud.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/5 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-zinc-900 dark:text-white">{stud.nis}</td>
                              <td className="px-6 py-4 font-mono">{stud.nisn || '—'}</td>
                              <td className="px-6 py-4 font-black text-zinc-850 dark:text-white">{stud.full_name}</td>
                              <td className="px-6 py-4 uppercase font-semibold text-[10px]">
                                {stud.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
                              </td>
                              <td className="px-6 py-4 text-right flex justify-end">
                                <DeleteButton action={handleClassStudent} confirmMessage="Keluarkan siswa ini dari kelas?">
                                  <input type="hidden" name="actionType" value="remove_student" />
                                  <input type="hidden" name="classId" value={detailClass.id} />
                                  <input type="hidden" name="studentId" value={stud.id} />
                                </DeleteButton>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 italic">
                              Belum ada siswa yang masuk ke kelas ini. Gunakan panel di sebelah kanan untuk menambahkan siswa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Assign Student Panel (Right column) */}
                <div className="flex flex-col gap-6">
                  
                  {/* Wali Kelas detail info card */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                    <div className="border-b border-zinc-100 dark:border-zinc-850 pb-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Wali Kelas Pengampu</span>
                      <h4 className="text-sm font-black text-zinc-800 dark:text-white mt-0.5">
                        {detailClass.homeroom_teacher_name || 'Belum Ditentukan'}
                      </h4>
                    </div>
                    <div className="text-xs text-zinc-500 space-y-1">
                      <p>&bull; Tingkat Kelas: Grade {detailClass.grade_level}</p>
                      <p>&bull; Kapasitas Terisi: {detailClassStudents.length}/30 Siswa</p>
                    </div>
                  </div>

                  {/* Assign Student Form */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white">Masukkan Siswa Baru</h4>
                      <p className="text-[10px] text-zinc-400">Masukkan siswa tanpa kelas ke dalam Kelas {detailClass.name}.</p>
                    </div>

                    {unassignedStudents.length > 0 ? (
                      <form action={handleClassStudent} className="flex flex-col gap-4">
                        <input type="hidden" name="actionType" value="assign_student" />
                        <input type="hidden" name="classId" value={detailClass.id} />

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Pilih Siswa *</label>
                          <select name="studentId" required className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-semibold">
                            <option value="">-- Pilih Siswa --</option>
                            {unassignedStudents.map((stud: any) => (
                              <option key={stud.id} value={stud.id}>
                                {stud.full_name} ({stud.nisn || 'No NISN'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2 shadow-xs cursor-pointer"
                        >
                          Masukkan ke Kelas
                        </button>
                      </form>
                    ) : (
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-xs text-zinc-400 italic text-center border border-dashed border-zinc-200 dark:border-zinc-800">
                        Tidak ada siswa tanpa kelas saat ini. Semua siswa sudah terbagi ke dalam kelas masing-masing.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUBJECTS TAB --- */}
      {tab === 'subjects' && (
        <div className="flex flex-col gap-6">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Subject & Schedule Management</h2>
              <p className="text-xs text-zinc-500">Kelola kurikulum, kelas sasaran, penugasan pengajar, dan jadwal pelajaran kelas 1A - 6B.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin?tab=subjects&subjectNew=true"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Tambah Mata Pelajaran Baru
              </Link>
              <a
                href="/api/subjects/export"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Ekspor CSV
              </a>
              <a
                href="/api/subjects/print"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </a>
            </div>
          </div>

          {!subjectNew && !subjectEditId && !detailSubjectId && (
            <>
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Stat 1: Total Subjects */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-blue-500">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Mata Pelajaran</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">{subjects.length}</p>
                    <p className="text-zinc-400 text-[10px] mt-1">aktif di kurikulum</p>
                  </div>
                </div>

                {/* Stat 2: Academic Subjects */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-emerald-500">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 shrink-0">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Kategori Akademik</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                      {subjects.filter((s: any) => s.category === 'Academic').length}
                    </p>
                    <p className="text-emerald-650 text-[10px] font-semibold mt-1">pelajaran inti utama</p>
                  </div>
                </div>

                {/* Stat 3: Local Content / Mulok */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-purple-500">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 shrink-0">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Kategori Non-Akademik / Mulok</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                      {subjects.filter((s: any) => s.category !== 'Academic').length}
                    </p>
                    <p className="text-purple-600 text-[10px] font-semibold mt-1">muatan lokal / seni jasmani</p>
                  </div>
                </div>
              </div>

              {/* Filters Block with Specific Classes (1A, 1B, etc.) */}
              <div className="flex flex-col gap-4 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-400 mr-2 shrink-0">Filter Kelas:</span>
                  {['Semua', ...Array.from(new Set(classes.map((c: any) => c.name)))].map((c: any) => (
                    <Link
                      key={c}
                      href={`/dashboard/admin?tab=subjects&subClass=${c}&subCategory=${subCategory}&subSearch=${subSearch}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        subClass === c
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-650 hover:bg-zinc-50 dark:hover:bg-zinc-850'
                      }`}
                    >
                      {c === 'Semua' ? 'Semua' : `Kelas ${c}`}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-850/50 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">Pencarian & Kategori:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Category Dropdown */}
                    <form method="GET" action="/dashboard/admin" className="flex items-center">
                      <input type="hidden" name="tab" value="subjects" />
                      <input type="hidden" name="subClass" value={subClass} />
                      <input type="hidden" name="subSearch" value={subSearch} />
                      <AutoSubmitSelect
                        name="subCategory"
                        defaultValue={subCategory}
                        options={[
                          { value: 'Semua', label: 'Semua Kategori' },
                          { value: 'Academic', label: 'Academic' },
                          { value: 'Local Content', label: 'Local Content' }
                        ]}
                        className="px-3.5 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold"
                      />
                    </form>

                    {/* Search bar */}
                    <form method="GET" action="/dashboard/admin" className="relative flex items-center min-w-[200px]">
                      <input type="hidden" name="tab" value="subjects" />
                      <input type="hidden" name="subClass" value={subClass} />
                      <input type="hidden" name="subCategory" value={subCategory} />
                      <Search className="absolute left-3.5 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        name="subSearch"
                        defaultValue={subSearch}
                        placeholder="Cari mata pelajaran..."
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      />
                    </form>
                  </div>
                </div>
              </div>

              {/* Class Schedule Section (Shows when a specific class is selected) */}
              {subClass !== 'Semua' && (
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left Column: Schedule Grid */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
                      <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4 mb-4">
                        <div>
                          <h3 className="text-lg font-black text-zinc-900 dark:text-white">Jadwal Pelajaran Kelas {subClass}</h3>
                          <p className="text-xs text-zinc-500">Jadwal pembelajaran dari hari Senin hingga Jumat.</p>
                        </div>
                      </div>

                      {/* Days Schedule */}
                      <div className="space-y-6">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => {
                          const daySlots = classSchedules.filter((cs: any) => cs.day_name === day);
                          return (
                            <div key={day} className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden">
                              {/* Day Header */}
                              <div className="bg-zinc-50 dark:bg-zinc-950 px-4 py-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850">
                                <span className="text-xs font-black text-zinc-800 dark:text-white uppercase tracking-wider">{day}</span>
                                <span className="text-[10px] font-bold text-zinc-400">{daySlots.length} Jam Pelajaran</span>
                              </div>

                              {/* Day Slots Table */}
                              <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
                                {daySlots.length > 0 ? (
                                  daySlots.map((cs: any) => (
                                    <div key={cs.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/10 transition-colors">
                                      <div className="flex items-start gap-4">
                                        <div className="text-xs font-black text-blue-600 dark:text-blue-450 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg shrink-0">
                                          {cs.start_time.substring(0, 5)} - {cs.end_time.substring(0, 5)}
                                        </div>
                                        <div>
                                          <span className="text-xs font-bold text-zinc-900 dark:text-white block">{cs.subject_name}</span>
                                          <span className="text-[10px] text-zinc-400 font-mono block">{cs.subject_code} &bull; Guru: {cs.teacher_name}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-center">
                                        <Link
                                          href={`/dashboard/admin?tab=subjects&subClass=${subClass}&scheduleEditId=${cs.id}`}
                                          className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-500 rounded-lg"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </Link>
                                        <DeleteButton action={handleClassSchedule} confirmMessage="Hapus slot jadwal pelajaran ini?">
                                          <input type="hidden" name="actionType" value="delete" />
                                          <input type="hidden" name="scheduleId" value={cs.id} />
                                          <input type="hidden" name="returnClass" value={subClass} />
                                        </DeleteButton>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-xs text-zinc-400 italic">
                                    Tidak ada jadwal pelajaran untuk hari {day}.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Schedule Slot Form */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs h-fit space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white">
                        {editSchedule ? 'Edit Slot Jadwal' : 'Tambah Slot Jadwal'}
                      </h4>
                      <p className="text-[10px] text-zinc-400">Atur hari, jam, mata pelajaran, dan pengajar kelas {subClass}.</p>
                    </div>

                    <form action={handleClassSchedule} className="flex flex-col gap-4">
                      {editSchedule && <input type="hidden" name="scheduleId" value={editSchedule.id} />}
                      <input type="hidden" name="classId" value={classes.find((c: any) => c.name === subClass)?.id} />
                      <input type="hidden" name="returnClass" value={subClass} />

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">Hari *</label>
                        <select name="day_name" required defaultValue={editSchedule?.day_name || 'Senin'} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                          <option value="Senin">Senin</option>
                          <option value="Selasa">Selasa</option>
                          <option value="Rabu">Rabu</option>
                          <option value="Kamis">Kamis</option>
                          <option value="Jumat">Jumat</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Mulai *</label>
                          <input type="time" name="start_time" required defaultValue={editSchedule?.start_time.substring(0, 5) || '07:30'} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Selesai *</label>
                          <input type="time" name="end_time" required defaultValue={editSchedule?.end_time.substring(0, 5) || '09:00'} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">Mata Pelajaran *</label>
                        <select name="subjectId" required defaultValue={editSchedule?.subject_id || ''} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                          <option value="">-- Pilih Mapel --</option>
                          {subjects.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">Guru Pengajar *</label>
                        <select name="teacherId" required defaultValue={editSchedule?.teacher_id || ''} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                          <option value="">-- Pilih Guru --</option>
                          {(teachersList as any[]).map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2 shadow-xs cursor-pointer"
                      >
                        {editSchedule ? 'Simpan Perubahan' : 'Tambah ke Jadwal'}
                      </button>

                      {editSchedule && (
                        <Link
                          href={`/dashboard/admin?tab=subjects&subClass=${subClass}`}
                          className="w-full py-2 text-center border border-zinc-200 dark:border-zinc-800 text-zinc-750 dark:text-zinc-400 rounded-xl text-xs font-bold block"
                        >
                          Batal Edit
                        </Link>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* Subjects Cards listing */}
              <div className="space-y-4">
                <div className="border-b border-zinc-150 dark:border-zinc-850 pb-2">
                  <h3 className="text-base font-extrabold text-zinc-850 dark:text-white">
                    {subClass === 'Semua' ? 'Daftar Semua Mata Pelajaran' : `Mata Pelajaran Diajarkan di Kelas ${subClass}`}
                  </h3>
                  <p className="text-xs text-zinc-400">Total {subjects.length} mata pelajaran terdaftar.</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjects.map((s: any) => (
                    <div key={s.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="p-6 space-y-4">
                        {/* Badge Row */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                            s.category === 'Academic' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30' 
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/30'
                          }`}>
                            {s.category || 'Academic'}
                          </span>
                          <span className="text-[10px] font-extrabold text-zinc-550 dark:text-zinc-450 bg-zinc-50 dark:bg-zinc-850 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
                            Kelas {s.grade_level || '1-6'}
                          </span>
                        </div>

                        {/* Content */}
                        <div>
                          <h3 className="text-base font-extrabold text-zinc-900 dark:text-white leading-tight">{s.name}</h3>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{s.code}</p>
                          <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{s.description || 'Tidak ada deskripsi.'}</p>
                        </div>

                        {/* Teachers list row */}
                        <div className="pt-2 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Pengajar</span>
                            {s.teachers && s.teachers.length > 0 ? (
                              <div className="flex items-center -space-x-1.5">
                                {s.teachers.slice(0, 3).map((tName: string, tIdx: number) => {
                                  const initials = tName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                  const colors = [
                                    'bg-blue-500 text-white',
                                    'bg-emerald-500 text-white',
                                    'bg-purple-500 text-white',
                                    'bg-amber-500 text-white',
                                    'bg-indigo-500 text-white'
                                  ];
                                  const colorClass = colors[tIdx % colors.length];
                                  return (
                                    <div
                                      key={tName}
                                      title={tName}
                                      className={`h-7 w-7 rounded-full border border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-black tracking-tighter shrink-0 select-none ${colorClass}`}
                                    >
                                      {initials}
                                    </div>
                                  );
                                })}
                                {s.teachers.length > 3 && (
                                  <div className="h-7 w-7 rounded-full border border-white dark:border-zinc-900 bg-zinc-150 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500 flex items-center justify-center shrink-0">
                                    +{s.teachers.length - 3}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-semibold italic">Belum ada pengajar</span>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Durasi</span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-450 inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {s.weekly_hours || 4} Jam / Minggu
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-950/20 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
                        <Link
                          href={`/dashboard/admin?tab=subjects&detailSubjectId=${s.id}`}
                          className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold"
                        >
                          Detail & Kelas
                        </Link>
                        
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admin?tab=subjects&subjectEditId=${s.id}`}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-550 dark:text-zinc-450 rounded-xl"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                          <DeleteButton action={handleSubject} confirmMessage="Yakin ingin menghapus mata pelajaran ini beserta seluruh penugasannya?">
                            <input type="hidden" name="actionType" value="delete" />
                            <input type="hidden" name="subjectId" value={s.id} />
                          </DeleteButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* STATE 1: CREATE / EDIT SUBJECT FORM */}
          {(subjectNew || subjectEditId) && (
            <form action={handleSubject} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
              {subjectEditId && <input type="hidden" name="subjectId" value={editItem?.id} />}
              
              {/* Form Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                    {subjectEditId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-xs text-zinc-500">Definisikan kurikulum, durasi jam pelajaran, dan sasaran kelas.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={subjectEditId ? `/dashboard/admin?tab=subjects&detailSubjectId=${editItem.id}` : '/dashboard/admin?tab=subjects'}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simpan Pelajaran
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Mata Pelajaran *</label>
                  <input
                    type="text" name="name" required
                    defaultValue={editItem?.name || ''}
                    placeholder="Contoh: Matematika, Bahasa Inggris"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Kode Pelajaran *</label>
                  <input
                    type="text" name="code" required
                    defaultValue={editItem?.code || ''}
                    placeholder="Contoh: MTK, BINGGRIS"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Kategori Pelajaran *</label>
                  <select
                    name="category" required
                    defaultValue={editItem?.category || 'Academic'}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Local Content">Local Content</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Jumlah Jam Pelajaran / Minggu *</label>
                  <input
                    type="number" name="weekly_hours" required min="1" max="15"
                    defaultValue={editItem?.weekly_hours || 4}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 mb-2">Tingkat Kelas Sasaran (Dapat pilih beberapa) *</label>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {[1, 2, 3, 4, 5, 6].map((g) => {
                      const isChecked = editItem?.grade_level 
                        ? editItem.grade_level.split(',').includes(String(g)) 
                        : true;
                      return (
                        <div key={g} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-3 py-1.5 rounded-xl">
                          <input
                            type="checkbox"
                            name="grade_levels"
                            value={g}
                            id={`grade-${g}`}
                            defaultChecked={isChecked}
                            className="rounded text-blue-650 focus:ring-blue-500 h-4 w-4"
                          />
                          <label htmlFor={`grade-${g}`} className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Kelas {g}</label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <label className="block text-xs font-bold text-zinc-500 mb-1">Deskripsi Pelajaran</label>
                <textarea
                  name="description" rows={3}
                  defaultValue={editItem?.description || ''}
                  placeholder="Penjelasan singkat mengenai materi pelajaran atau target pembelajaran..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <input
                  type="checkbox" name="is_core" id="is_core"
                  defaultChecked={editItem ? editItem.is_core : true}
                  className="rounded text-blue-650 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="is_core" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Tandai sebagai Pelajaran Utama (Akademik)</label>
              </div>
            </form>
          )}

          {/* STATE 2: DETAIL SUBJECT VIEW */}
          {detailSubjectId && detailSubject && (
            <div className="flex flex-col gap-6">
              {/* Back Link */}
              <Link 
                href="/dashboard/admin?tab=subjects"
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Daftar Mata Pelajaran
              </Link>

              {/* Main Content Detail Grid */}
              <div className="grid lg:grid-cols-3 gap-6 items-start">
                
                {/* Left side: Subject detail information and assigned classes */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Subject Summary Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-850">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${
                            detailSubject.category === 'Academic' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30' 
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/30'
                          }`}>
                            {detailSubject.category || 'Academic'}
                          </span>
                          <span className="text-[10px] font-extrabold text-zinc-550 dark:text-zinc-450 bg-zinc-50 dark:bg-zinc-850 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                            Kelas {detailSubject.grade_level || '1-6'}
                          </span>
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{detailSubject.name}</h3>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{detailSubject.code}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`/dashboard/admin?tab=subjects&subjectEditId=${detailSubject.id}`}
                          className="px-4 py-2 border border-zinc-250 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                          Edit Mapel
                        </Link>
                        <DeleteButton action={handleSubject} confirmMessage="Yakin ingin menghapus mata pelajaran ini beserta seluruh penugasannya?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="subjectId" value={detailSubject.id} />
                        </DeleteButton>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Deskripsi</span>
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">{detailSubject.description || 'Tidak ada deskripsi.'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Durasi Mingguan</span>
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-450 inline-flex items-center gap-1.5">
                            <Clock className="h-4.5 w-4.5" />
                            {detailSubject.weekly_hours || 4} Jam Pelajaran / Minggu
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Tingkatan Sasaran</span>
                          <span className="text-sm font-bold text-zinc-800 dark:text-white">
                            Kelas {detailSubject.grade_level || '1-6'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Classes and Teachers List */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                    <div className="p-6 border-b border-zinc-100 dark:border-zinc-850">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white">Penugasan Kelas & Guru Pengajar</h4>
                      <p className="text-[11px] text-zinc-400">Guru pengajar mata pelajaran ini pada setiap kelas.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
                        <thead className="bg-zinc-550/5 dark:bg-zinc-950/20 text-[10px] font-bold uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-850">
                          <tr>
                            <th className="px-6 py-4">Kelas</th>
                            <th className="px-6 py-4">Nama Pengajar / Guru</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                          {detailSubjectAssignments && detailSubjectAssignments.length > 0 ? (
                            detailSubjectAssignments.map((ass: any) => (
                              <tr key={ass.assignment_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/5 transition-colors">
                                <td className="px-6 py-4 font-black text-zinc-950 dark:text-white">{ass.class_name}</td>
                                <td className="px-6 py-4 font-bold text-indigo-650 dark:text-indigo-400">{ass.teacher_name}</td>
                                <td className="px-6 py-4 text-right flex justify-end">
                                  <DeleteButton action={handleTeacherSubjectAssignment} confirmMessage="Hapus penugasan guru pengajar untuk kelas ini?">
                                    <input type="hidden" name="actionType" value="delete" />
                                    <input type="hidden" name="subjectId" value={detailSubject.id} />
                                    <input type="hidden" name="assignmentId" value={ass.assignment_id} />
                                  </DeleteButton>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-6 py-8 text-center text-zinc-400 italic">
                                Belum ada penugasan pengajar untuk kelas mana pun. Gunakan formulir di sebelah kanan untuk menambahkan penugasan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right side: Add class/teacher assignment form */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-800 dark:text-white">Tambah Penugasan Kelas</h4>
                    <p className="text-[10px] text-zinc-400">Pasangkan guru pengajar dengan kelas sasaran.</p>
                  </div>

                  <form action={handleTeacherSubjectAssignment} className="flex flex-col gap-4 pt-2">
                    <input type="hidden" name="subjectId" value={detailSubject.id} />
                    
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">Pilih Kelas *</label>
                      <select name="classId" required className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                        <option value="">-- Pilih Kelas --</option>
                        {classes.map((c: any) => (
                          <option key={c.id} value={c.id}>Kelas {c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-1">Pilih Guru Pengajar *</label>
                      <select name="teacherId" required className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                        <option value="">-- Pilih Guru --</option>
                        {(teachersList as any[]).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2 shadow-xs cursor-pointer"
                    >
                      Tugaskan Pengajar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- ACADEMIC PERIODS TAB --- */}
      {tab === 'periods' && (
        <div className="flex flex-col gap-6">
          {/* Header Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
            <div>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-white">Manajemen Tahun Ajaran & Semester</h2>
              <p className="text-xs text-zinc-500">Kelola periode akademik, penetapan tanggal penting, dan kalender sekolah.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/admin?tab=periods&periodNew=true"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Tambah Tahun Ajaran Baru
              </Link>
              <a
                href="/api/periods/export"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Ekspor CSV
              </a>
              <a
                href="/api/periods/print"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak PDF
              </a>
            </div>
          </div>

          {!periodNew && !periodEditId && !viewCalendarPeriodId && (
            <>
              {/* Stat Cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat 1: Current Status */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-blue-500">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-650 dark:text-blue-400 shrink-0">
                    <CalendarCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Status Saat Ini</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white leading-tight">
                      T.A. {activePeriod ? activePeriod.academic_year : '—'}
                    </p>
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-md mt-1">
                      {activePeriod ? `Semester ${activePeriod.semester === 1 ? 'Ganjil' : 'Genap'} Aktif` : 'Tidak ada'}
                    </span>
                  </div>
                </div>

                {/* Stat 2: Upcoming Agenda */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-amber-500">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Agenda Mendatang</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white leading-tight">Ujian Tengah</p>
                    <p className="text-zinc-400 text-[10px] mt-1">Mulai dalam 12 hari</p>
                  </div>
                </div>

                {/* Stat 3: Active Students */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-emerald-500">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total Siswa Aktif</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white leading-tight">1.240</p>
                    <p className="text-emerald-600 text-[10px] font-semibold mt-1">+4.2% dari tahun lalu</p>
                  </div>
                </div>

                {/* Stat 4: Grading Status */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex items-center gap-4 border-l-4 border-l-red-500">
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Input Nilai</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white leading-tight">18 Kelas</p>
                    <p className="text-red-600 text-[10px] font-semibold mt-1">Belum tuntas</p>
                  </div>
                </div>
              </div>

              {/* Accordion List */}
              <div className="flex flex-col gap-4">
                {academicYears.map((year) => {
                  const sems = yearsMap[year] || [];
                  const ganjil = sems.find(p => p.semester === 1);
                  const genap = sems.find(p => p.semester === 2);
                  const isActiveYear = sems.some(p => p.is_active);
                  const isDraftYear = sems.every(p => !p.is_released);
                  
                  let badgeText = 'SELESAI';
                  let badgeClass = 'bg-zinc-150 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-750';
                  let descText = 'Arsip Akademik Tersedia';

                  if (isActiveYear) {
                    badgeText = 'AKTIF';
                    badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50';
                    descText = formatIndoDateRange(ganjil?.start_date, genap?.end_date);
                  } else if (isDraftYear) {
                    badgeText = 'MENDATANG';
                    badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/50';
                    descText = 'Draft Periode Akademik';
                  }

                  return (
                    <details
                      key={year}
                      className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden"
                      open={isActiveYear}
                    >
                      <summary className="flex items-center justify-between p-6 cursor-pointer select-none hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-400 group-open:bg-blue-50 dark:group-open:bg-blue-950/30 group-open:text-blue-600 dark:group-open:text-blue-450 transition-colors">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white group-open:text-blue-600 dark:group-open:text-blue-405 transition-colors">
                              Tahun Ajaran {year}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider ${badgeClass}`}>
                                {badgeText}
                              </span>
                              <span className="text-[10px] text-zinc-450">{descText}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Mock avatar group */}
                          <div className="hidden sm:flex items-center -space-x-2">
                            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=60" alt="" className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 object-cover" />
                            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=60" alt="" className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 object-cover" />
                            <div className="h-6 w-6 rounded-full border border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-850 text-[9px] font-bold text-zinc-500 flex items-center justify-center">
                              +1.2k
                            </div>
                          </div>
                          <ChevronDown className="h-5 w-5 text-zinc-405 group-open:rotate-180 transition-transform" />
                        </div>
                      </summary>

                      <div className="p-6 border-t border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/20 grid md:grid-cols-2 gap-6">
                        {/* Semester Ganjil Card */}
                        {ganjil && (
                          <div className={`p-6 rounded-2xl border ${ganjil.is_active ? 'bg-blue-50/20 border-blue-200 dark:bg-blue-950/5 dark:border-blue-900/50 shadow-xs' : 'bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-black text-blue-700 dark:text-blue-400">Semester Ganjil</h4>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider ${
                                ganjil.is_active ? 'bg-emerald-55 text-white border-emerald-600' :
                                !ganjil.is_released ? 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' :
                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30'
                              }`}>
                                {ganjil.is_active ? 'SEDANG BERJALAN' : !ganjil.is_released ? 'DRAF PERIODE' : 'ARSIP'}
                              </span>
                            </div>

                            <div className="space-y-3.5 my-6 text-xs text-zinc-600 dark:text-zinc-450">
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Mulai Pembelajaran</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDate(ganjil.start_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Ujian Tengah Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDateRange(ganjil.midterm_start_date, ganjil.midterm_end_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Ujian Akhir Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDateRange(ganjil.final_start_date, ganjil.final_end_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Akhir Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDate(ganjil.end_date)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850 w-full">
                              <div className="flex items-center gap-2 w-full">
                                <Link
                                  href={`/dashboard/admin?tab=periods&viewCalendarPeriodId=${ganjil.id}`}
                                  className="w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 block"
                                >
                                  Lihat Kalender Pendidikan
                                </Link>
                              </div>
                              {!ganjil.is_active && (
                                <div className="flex items-center gap-2 w-full">
                                  {ganjil.is_released && (
                                    <form action={handlePeriod} className="w-full">
                                      <input type="hidden" name="actionType" value="activate" />
                                      <input type="hidden" name="periodId" value={ganjil.id} />
                                      <button type="submit" className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                                        Aktifkan Semester
                                      </button>
                                    </form>
                                  )}
                                  <Link
                                    href={`/dashboard/admin?tab=periods&periodEditId=${ganjil.id}`}
                                    className="py-2 px-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-zinc-550 dark:text-zinc-450 shrink-0"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Link>
                                  <DeleteButton action={handlePeriod} confirmMessage="Yakin ingin menghapus periode ini?">
                                    <input type="hidden" name="actionType" value="delete" />
                                    <input type="hidden" name="periodId" value={ganjil.id} />
                                  </DeleteButton>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Semester Genap Card */}
                        {genap && (
                          <div className={`p-6 rounded-2xl border ${genap.is_active ? 'bg-blue-50/20 border-blue-200 dark:bg-blue-950/5 dark:border-blue-900/55 shadow-xs' : 'bg-white dark:bg-zinc-900 border-zinc-150 dark:border-zinc-850'}`}>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-base font-black text-blue-750 dark:text-blue-400">Semester Genap</h4>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider ${
                                genap.is_active ? 'bg-emerald-55 text-white border-emerald-600' :
                                !genap.is_released ? 'bg-zinc-100 text-zinc-550 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-450 dark:border-zinc-700' :
                                'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/30'
                              }`}>
                                {genap.is_active ? 'SEDANG BERJALAN' : !genap.is_released ? 'DRAF PERIODE' : 'BELUM BERJALAN'}
                              </span>
                            </div>

                            <div className="space-y-3.5 my-6 text-xs text-zinc-650 dark:text-zinc-450">
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Mulai Pembelajaran</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDate(genap.start_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Ujian Tengah Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDateRange(genap.midterm_start_date, genap.midterm_end_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Ujian Akhir Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDateRange(genap.final_start_date, genap.final_end_date)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-semibold text-zinc-400">Akhir Semester</span>
                                <span className="font-bold text-zinc-800 dark:text-white">{formatIndoDate(genap.end_date)}</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-850 w-full">
                              <div className="flex items-center gap-2 w-full">
                                <Link
                                  href={`/dashboard/admin?tab=periods&viewCalendarPeriodId=${genap.id}`}
                                  className="w-full py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-center text-xs font-bold text-zinc-700 dark:text-zinc-300 block"
                                >
                                  Lihat Kalender Pendidikan
                                </Link>
                              </div>
                              {!genap.is_active && (
                                <div className="flex items-center gap-2 w-full">
                                  {genap.is_released && (
                                    <form action={handlePeriod} className="w-full">
                                      <input type="hidden" name="actionType" value="activate" />
                                      <input type="hidden" name="periodId" value={genap.id} />
                                      <button type="submit" className="w-full py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer">
                                        Aktifkan Semester
                                      </button>
                                    </form>
                                  )}
                                  <Link
                                    href={`/dashboard/admin?tab=periods&periodEditId=${genap.id}`}
                                    className="py-2 px-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-zinc-550 dark:text-zinc-450 shrink-0"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Link>
                                  <DeleteButton action={handlePeriod} confirmMessage="Yakin ingin menghapus periode ini?">
                                    <input type="hidden" name="actionType" value="delete" />
                                    <input type="hidden" name="periodId" value={genap.id} />
                                  </DeleteButton>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            </>
          )}

          {/* STATE: DETAILED YEARLY CALENDAR VIEW */}
          {!periodNew && !periodEditId && viewCalendarPeriodId && viewCalendarPeriod && (() => {
            const yearPrefix = viewCalendarPeriod.name.substring(0, 9); // e.g. "2024/2025"
            const startYear = parseInt(yearPrefix.split('/')[0], 10);
            const endYear = parseInt(yearPrefix.split('/')[1], 10);

            // Define months in order (July of startYear to June of endYear)
            const academicMonths = [
              { month: 6, year: startYear, name: 'Juli' },
              { month: 7, year: startYear, name: 'Agustus' },
              { month: 8, year: startYear, name: 'September' },
              { month: 9, year: startYear, name: 'Oktober' },
              { month: 10, year: startYear, name: 'November' },
              { month: 11, year: startYear, name: 'Desember' },
              { month: 0, year: endYear, name: 'Januari' },
              { month: 1, year: endYear, name: 'Februari' },
              { month: 2, year: endYear, name: 'Maret' },
              { month: 3, year: endYear, name: 'April' },
              { month: 4, year: endYear, name: 'Mei' },
              { month: 5, year: endYear, name: 'Juni' }
            ];

            return (
              <div className="flex flex-col gap-6">
                {/* Back Link */}
                <Link
                  href="/dashboard/admin?tab=periods"
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold w-fit"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali ke Manajemen Tahun Ajaran
                </Link>

                {/* Main Container */}
                <div className="grid lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left 2 Columns: 12-Month Calendar Grid */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-150 dark:border-zinc-850 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-zinc-900 dark:text-white">
                            Kalender Pendidikan T.A. {yearPrefix}
                          </h3>
                          <p className="text-xs text-zinc-500">Visualisasi tahunan pembagian rapor, hari libur nasional, dan masa ujian.</p>
                        </div>
                        <a
                          href="/api/periods/print"
                          target="_blank"
                          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800"
                        >
                          <Printer className="h-4 w-4" />
                          Cetak PDF Kalender
                        </a>
                      </div>

                      {/* Legend / Keterangan Warna */}
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-emerald-500 border border-emerald-600 block shrink-0" />
                          <span>Mulai Pembelajaran</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-blue-500 border border-blue-600 block shrink-0" />
                          <span>Akhir Semester</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-red-100 dark:bg-red-950/45 border border-red-200 dark:border-red-900/30 block shrink-0" />
                          <span>Hari Libur Sekolah / Nas.</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-amber-100 dark:bg-amber-950/45 border border-amber-200 dark:border-amber-900/30 block shrink-0" />
                          <span>Ujian Tengah Semester (UTS)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-purple-100 dark:bg-purple-950/45 border border-purple-200 dark:border-purple-900/30 block shrink-0" />
                          <span>Ujian Akhir Semester (UAS)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          <span className="h-4 w-4 rounded bg-teal-100 dark:bg-teal-950/45 border border-teal-200 dark:border-teal-900/30 block shrink-0" />
                          <span>Pembagian Rapor / Rapat</span>
                        </div>
                      </div>

                      {/* 12 Months Cards Grid */}
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {academicMonths.map(({ month, year, name: mName }) => {
                          const totalDays = new Date(year, month + 1, 0).getDate();
                          const startDayOffset = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, etc.
                          
                          const cells = [];
                          // Fill blank cells
                          for (let i = 0; i < startDayOffset; i++) {
                            cells.push(null);
                          }
                          // Fill day cells
                          for (let d = 1; d <= totalDays; d++) {
                            cells.push(d);
                          }

                          return (
                            <div key={`${year}-${month}`} className="border border-zinc-150 dark:border-zinc-850 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
                              <div className="bg-zinc-50 dark:bg-zinc-950 px-3 py-2 border-b border-zinc-150 dark:border-zinc-850 flex items-center justify-between">
                                <span className="text-xs font-extrabold text-zinc-850 dark:text-white">{mName} {year}</span>
                              </div>

                              <div className="p-2.5">
                                {/* Weekday headers */}
                                <div className="grid grid-cols-7 text-center text-[9px] font-black text-zinc-400 uppercase mb-1">
                                  <span>Min</span>
                                  <span>Sen</span>
                                  <span>Sel</span>
                                  <span>Rab</span>
                                  <span>Kam</span>
                                  <span>Jum</span>
                                  <span>Sab</span>
                                </div>

                                {/* Day cells */}
                                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                                  {cells.map((day, idx) => {
                                    if (day === null) {
                                      return <div key={`empty-${idx}`} />;
                                    }

                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSunday = new Date(year, month, day).getDay() === 0;

                                    // Helper matches
                                    const matchesGanjil = viewCalendarPeriods[0] || {};
                                    const matchesGenap = viewCalendarPeriods[1] || {};

                                    const isStart = matchesGanjil.start_date === dateStr || matchesGenap.start_date === dateStr;
                                    const isEnd = matchesGanjil.end_date === dateStr || matchesGenap.end_date === dateStr;
                                    
                                    const isUTS = (matchesGanjil.midterm_start_date <= dateStr && dateStr <= matchesGanjil.midterm_end_date) ||
                                                  (matchesGenap.midterm_start_date <= dateStr && dateStr <= matchesGenap.midterm_end_date);
                                                  
                                    const isUAS = (matchesGanjil.final_start_date <= dateStr && dateStr <= matchesGanjil.final_end_date) ||
                                                  (matchesGenap.final_start_date <= dateStr && dateStr <= matchesGenap.final_end_date);

                                    // Find event in database
                                    const activeEvent = calendarEvents.find(e => {
                                      const estart = new Date(e.start_date).toISOString().split('T')[0];
                                      const eend = new Date(e.end_date).toISOString().split('T')[0];
                                      return estart <= dateStr && dateStr <= eend;
                                    });

                                    let cellClass = "h-6 w-6 flex items-center justify-center rounded-md transition-colors select-none ";
                                    let titleAttr = "";

                                    if (isStart) {
                                      cellClass += "bg-emerald-500 text-white font-extrabold shadow-xs";
                                      titleAttr = "Mulai Pembelajaran Semester";
                                    } else if (isEnd) {
                                      cellClass += "bg-blue-500 text-white font-extrabold shadow-xs";
                                      titleAttr = "Akhir Pembelajaran Semester";
                                    } else if (activeEvent) {
                                      titleAttr = activeEvent.event_name;
                                      if (activeEvent.event_type === 'holiday') {
                                        cellClass += "bg-red-100 text-red-700 dark:bg-red-950/45 dark:text-red-400 font-bold border border-red-200 dark:border-red-900/35";
                                      } else if (activeEvent.event_type === 'exam') {
                                        cellClass += "bg-amber-100 text-amber-800 dark:bg-amber-950/45 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900/35";
                                      } else {
                                        cellClass += "bg-teal-100 text-teal-800 dark:bg-teal-950/45 dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-900/35";
                                      }
                                    } else if (isUTS) {
                                      cellClass += "bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450";
                                      titleAttr = "Masa UTS (Ujian Tengah Semester)";
                                    } else if (isUAS) {
                                      cellClass += "bg-purple-100 text-purple-800 dark:bg-purple-950/20 dark:text-purple-450";
                                      titleAttr = "Masa UAS (Ujian Akhir Semester)";
                                    } else if (isSunday) {
                                      cellClass += "text-red-500 font-bold";
                                      titleAttr = "Hari Ahad / Minggu";
                                    } else {
                                      cellClass += "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800";
                                    }

                                    return (
                                      <div
                                        key={day}
                                        className={cellClass}
                                        title={titleAttr || undefined}
                                      >
                                        {day}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Events list & Form */}
                  <div className="flex flex-col gap-6">
                    
                    {/* List of Events / Holidays */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-white">Daftar Libur & Agenda Kegiatan</h4>
                        <p className="text-[10px] text-zinc-400">Daftar libur nasional, libur semester, dan rapat pembagian rapor.</p>
                      </div>

                      <div className="divide-y divide-zinc-100 dark:divide-zinc-850 max-h-[300px] overflow-y-auto pr-1">
                        {calendarEvents.length > 0 ? (
                          calendarEvents.map((ev: any) => {
                            const sDate = new Date(ev.start_date);
                            const eDate = new Date(ev.end_date);
                            const isSameDate = ev.start_date === ev.end_date;
                            
                            let dateLabel = sDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                            if (!isSameDate) {
                              dateLabel += ` - ${eDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
                            }

                            let typeLabel = "Libur";
                            let typeClass = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400";
                            if (ev.event_type === 'exam') {
                              typeLabel = "Ujian";
                              typeClass = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400";
                            } else if (ev.event_type === 'activity') {
                              typeLabel = "Rapor/Kegiatan";
                              typeClass = "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400";
                            }

                            return (
                              <div key={ev.id} className="py-3 flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-450 font-mono">
                                      {dateLabel}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${typeClass}`}>
                                      {typeLabel}
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 block">
                                    {ev.event_name}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                                    {ev.period_name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Link
                                    href={`/dashboard/admin?tab=periods&viewCalendarPeriodId=${viewCalendarPeriodId}&calendarEventEditId=${ev.id}`}
                                    className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-550 dark:text-zinc-450 rounded-xl"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Link>
                                  <DeleteButton action={handleCalendarEvent} confirmMessage="Hapus agenda kalender ini?">
                                    <input type="hidden" name="actionType" value="delete" />
                                    <input type="hidden" name="eventId" value={ev.id} />
                                    <input type="hidden" name="returnPeriod" value={String(viewCalendarPeriodId)} />
                                  </DeleteButton>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-zinc-400 italic">
                            Belum ada agenda terdaftar.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add / Edit Event Form */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-white">
                          {editCalendarEvent ? 'Edit Agenda Kalender' : 'Tambah Agenda / Libur'}
                        </h4>
                        <p className="text-[10px] text-zinc-400">Atur agenda penting atau hari libur pada tahun ajaran ini.</p>
                      </div>

                      <form action={handleCalendarEvent} className="flex flex-col gap-4">
                        {editCalendarEvent && <input type="hidden" name="eventId" value={editCalendarEvent.id} />}
                        <input type="hidden" name="returnPeriod" value={String(viewCalendarPeriodId)} />

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Pilih Semester Target *</label>
                          <select name="periodId" required defaultValue={editCalendarEvent?.period_id || ''} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                            <option value="">-- Pilih Semester --</option>
                            {viewCalendarPeriods.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Nama Agenda / Hari Libur *</label>
                          <input
                            type="text" name="event_name" required
                            defaultValue={editCalendarEvent?.event_name || ''}
                            placeholder="Contoh: Libur Hari Raya Idul Fitri"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">Mulai *</label>
                            <input
                              type="date" name="start_date" required
                              defaultValue={editCalendarEvent ? new Date(editCalendarEvent.start_date).toISOString().split('T')[0] : ''}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1">Selesai</label>
                            <input
                              type="date" name="end_date"
                              defaultValue={editCalendarEvent ? new Date(editCalendarEvent.end_date).toISOString().split('T')[0] : ''}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 mb-1">Tipe Agenda *</label>
                          <select name="event_type" required defaultValue={editCalendarEvent?.event_type || 'holiday'} className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
                            <option value="holiday">Hari Libur Sekolah / Nasional</option>
                            <option value="exam">Ujian (UTS / UAS)</option>
                            <option value="activity">Kegiatan Akademik / Rapat Rapor</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold mt-2 shadow-xs cursor-pointer"
                        >
                          {editCalendarEvent ? 'Simpan Perubahan' : 'Tambah Agenda'}
                        </button>

                        {editCalendarEvent && (
                          <Link
                            href={`/dashboard/admin?tab=periods&viewCalendarPeriodId=${viewCalendarPeriodId}`}
                            className="w-full py-2 text-center border border-zinc-200 dark:border-zinc-800 text-zinc-750 dark:text-zinc-400 rounded-xl text-xs font-bold block"
                          >
                            Batal Edit
                          </Link>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STATE 1: CREATE YEAR FORM */}
          {periodNew && (
            <form action={handlePeriod} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
              <input type="hidden" name="actionType" value="create_year" />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">Tambah Tahun Ajaran Baru</h3>
                  <p className="text-xs text-zinc-500">Konfigurasi secara bersamaan untuk Semester Ganjil dan Genap.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/admin?tab=periods"
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simpan Tahun Ajaran
                  </button>
                </div>
              </div>

              {/* Main inputs */}
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-zinc-500 mb-1">Tahun Ajaran *</label>
                <input
                  type="text" name="academic_year" required
                  placeholder="Misal: 2025/2026"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Semester Ganjil Configuration */}
                <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-blue-700 border-b border-zinc-100 dark:border-zinc-800 pb-2">Semester Ganjil (Semester 1)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Mulai Pembelajaran</label>
                      <input type="date" name="start_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Akhir Semester</label>
                      <input type="date" name="end_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Mulai</label>
                      <input type="date" name="midterm_start_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Selesai</label>
                      <input type="date" name="midterm_end_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Mulai</label>
                      <input type="date" name="final_start_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Selesai</label>
                      <input type="date" name="final_end_date_ganjil" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="is_released_ganjil" id="is_released_ganjil" defaultChecked className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    <label htmlFor="is_released_ganjil" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Rilis Kalender / Publish</label>
                  </div>
                </div>

                {/* Semester Genap Configuration */}
                <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl space-y-4">
                  <h4 className="text-sm font-bold text-blue-750 border-b border-zinc-100 dark:border-zinc-800 pb-2">Semester Genap (Semester 2)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Mulai Pembelajaran</label>
                      <input type="date" name="start_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Akhir Semester</label>
                      <input type="date" name="end_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Mulai</label>
                      <input type="date" name="midterm_start_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Selesai</label>
                      <input type="date" name="midterm_end_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Mulai</label>
                      <input type="date" name="final_start_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Selesai</label>
                      <input type="date" name="final_end_date_genap" className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" name="is_released_genap" id="is_released_genap" defaultChecked className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    <label htmlFor="is_released_genap" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Rilis Kalender / Publish</label>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* STATE 2: EDIT PERIOD FORM */}
          {periodEditId && editItem && (
            <form action={handlePeriod} className="flex flex-col gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
              <input type="hidden" name="actionType" value="edit_period" />
              <input type="hidden" name="periodId" value={editItem.id} />
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 pb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">Edit Detail Semester</h3>
                  <p className="text-xs text-zinc-500">Sesuaikan rentang tanggal penting untuk periode ini.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/admin?tab=periods"
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Periode / Semester *</label>
                  <input
                    type="text" name="name" required
                    defaultValue={editItem.name || ''}
                    placeholder="Misal: 2025/2026 Ganjil"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Tahun Ajaran *</label>
                  <input
                    type="text" name="academic_year" required
                    defaultValue={editItem.academic_year || ''}
                    placeholder="Misal: 2025/2026"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Semester *</label>
                  <select
                    name="semester" required
                    defaultValue={String(editItem.semester || '1')}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                  >
                    <option value="1">Semester 1 (Ganjil)</option>
                    <option value="2">Semester 2 (Genap)</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Tanggal Utama</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Mulai Pembelajaran</label>
                      <input
                        type="date" name="start_date"
                        defaultValue={editItem.start_date ? new Date(editItem.start_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">Akhir Semester</label>
                      <input
                        type="date" name="end_date"
                        defaultValue={editItem.end_date ? new Date(editItem.end_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ujian Tengah Semester (UTS)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Mulai</label>
                      <input
                        type="date" name="midterm_start_date"
                        defaultValue={editItem.midterm_start_date ? new Date(editItem.midterm_start_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UTS Selesai</label>
                      <input
                        type="date" name="midterm_end_date"
                        defaultValue={editItem.midterm_end_date ? new Date(editItem.midterm_end_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:col-span-2 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ujian Akhir Semester (UAS)</h4>
                  <div className="grid grid-cols-2 gap-4 max-w-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Mulai</label>
                      <input
                        type="date" name="final_start_date"
                        defaultValue={editItem.final_start_date ? new Date(editItem.final_start_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-450 mb-1">UAS Selesai</label>
                      <input
                        type="date" name="final_end_date"
                        defaultValue={editItem.final_end_date ? new Date(editItem.final_end_date).toISOString().split('T')[0] : ''}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-zinc-100 dark:border-zinc-850 pt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" name="is_released" id="is_released"
                    defaultChecked={editItem.is_released}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="is_released" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Rilis Kalender / Publish</label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox" name="is_active" id="is_active"
                    defaultChecked={editItem.is_active}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="is_active" className="text-xs font-semibold text-zinc-650 dark:text-zinc-400">Aktifkan Semester Saat Ini (Nonaktifkan periode lain)</label>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- EXTRACURRICULARS TAB --- */}
      {tab === 'ekskuls' && (
        <div className="flex flex-col gap-6">
          {/* STATE 1: EDIT / CREATE FORM VIEW */}
          {ekskulEditId && (
            <form action={handleEkskul} className="flex flex-col gap-6">
              {isEkskulEdit && <input type="hidden" name="ekskulId" value={editItem.id} />}
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                    {isEkskulEdit ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
                  </h3>
                  <p className="text-xs text-zinc-500">Rancang program ekstrakurikuler baru untuk siswa SD Maju Jaya.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={isEkskulEdit ? `/dashboard/admin?tab=ekskuls&detailEkskulId=${editItem.id}` : '/dashboard/admin?tab=ekskuls'}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-850"
                  >
                    Batal
                  </Link>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simpan Kegiatan
                  </button>
                </div>
              </div>

                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left & Middle Column: Info & Schedule */}
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Basic Info Section */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Informasi Dasar</h4>
                      
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Nama Kegiatan / Ekskul *</label>
                        <input
                          type="text" name="name" required
                          defaultValue={editItem?.name || ''}
                          placeholder="Misal: Robotik, Futsal, Seni Tari..."
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Kategori *</label>
                          <select
                            name="category" required
                            defaultValue={editItem?.category || 'Technology & STEM'}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                          >
                            <option value="Technology & STEM">Technology & STEM</option>
                            <option value="Sports">Sports</option>
                            <option value="Art">Art</option>
                            <option value="Music">Music</option>
                            <option value="Art & Scouting">Art & Scouting</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Target Kelompok Usia *</label>
                          <select
                            name="target_age" required
                            defaultValue={editItem?.target_age || 'Grade 4-6'}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                          >
                            <option value="Grade 1-3">Kelas 1 - 3 (Kecil)</option>
                            <option value="Grade 4-6">Kelas 4 - 6 (Besar)</option>
                            <option value="Grade 1-6">Semua Kelas (1 - 6)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Deskripsi Kegiatan</label>
                        <textarea
                          name="description" rows={4}
                          defaultValue={editItem?.description || ''}
                          placeholder="Jelaskan tujuan dan aktivitas utama dari ekskul ini..."
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Schedule & Location Section */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Jadwal & Tempat Pelaksanaan</h4>
                      
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-2">Hari Pelaksanaan (Dapat pilih beberapa)</label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { id: 'day_mon', label: 'Senin', active: scheduleDayStr.includes('Senin') },
                            { id: 'day_tue', label: 'Selasa', active: scheduleDayStr.includes('Selasa') },
                            { id: 'day_wed', label: 'Rabu', active: scheduleDayStr.includes('Rabu') },
                            { id: 'day_thu', label: 'Kamis', active: scheduleDayStr.includes('Kamis') },
                            { id: 'day_fri', label: 'Jumat', active: scheduleDayStr.includes('Jumat') },
                            { id: 'day_sat', label: 'Sabtu', active: scheduleDayStr.includes('Sabtu') },
                            { id: 'day_sun', label: 'Minggu', active: scheduleDayStr.includes('Minggu') }
                          ].map(day => (
                            <label key={day.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-xs font-medium cursor-pointer">
                              <input type="checkbox" name={day.id} defaultChecked={day.active} className="rounded text-blue-600 focus:ring-blue-500" />
                              <span>{day.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Jam Mulai</label>
                          <input type="time" name="start_time" defaultValue={startTimeVal} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Jam Selesai</label>
                          <input type="time" name="end_time" defaultValue={endTimeVal} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Tempat / Ruangan Pelaksanaan *</label>
                          <input
                            type="text" name="venue" required
                            defaultValue={editItem?.venue || ''}
                            placeholder="Misal: Lapangan Utama, Lab IPA 2..."
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-zinc-500 mb-1">Seragam yang Digunakan *</label>
                          <input
                            type="text" name="uniform" required
                            defaultValue={editItem?.uniform || ''}
                            placeholder="Misal: Kaos Olahraga, Seragam Pramuka..."
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Settings & Coach */}
                  <div className="flex flex-col gap-6">
                    {/* Coach Assignment Card */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Pembina / Coach</h4>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Pilih Coach Pembina *</label>
                        <select
                          name="coach_id" required
                          defaultValue={editItem?.coach_id || ''}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                        >
                          <option value="">-- Pilih Coach --</option>
                          {(coachesList as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Registration Settings */}
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-5">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">Pengaturan Registrasi</h4>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-zinc-800 dark:text-white block">Pendaftaran Terbuka</span>
                          <span className="text-[10px] text-zinc-400">Siswa dapat langsung mendaftar</span>
                        </div>
                        <input
                          type="checkbox" name="is_open_reg"
                          defaultChecked={editItem ? editItem.is_open_reg : true}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-zinc-800 dark:text-white block">Kegiatan Berbayar</span>
                          <span className="text-[10px] text-zinc-400">Memerlukan biaya pendaftaran tambahan</span>
                        </div>
                        <input
                          type="checkbox" name="is_paid"
                          defaultChecked={editItem ? editItem.is_paid : false}
                          className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Kapasitas Maksimal (Siswa)</label>
                        <input
                          type="number" name="max_capacity"
                          defaultValue={editItem?.max_capacity || 24}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </form>
          )}

          {/* STATE 2: DETAIL VIEW */}
          {detailEkskulId && detailEkskul && !ekskulEditId && (
            <div className="flex flex-col gap-6">
              {/* Back Button navigation */}
              <Link 
                href="/dashboard/admin?tab=ekskuls"
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white text-xs font-bold w-fit"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Katalog
              </Link>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left 2/3 Content: Main details, Stats, and Member List */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Card Info Utama */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-start gap-4">
                    {/* Club Big Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                      {detailEkskul.name.toLowerCase().includes('scout') || detailEkskul.name.toLowerCase().includes('pramuka') ? <Tent className="h-8 w-8 text-amber-500" /> :
                       detailEkskul.name.toLowerCase().includes('robot') ? <Bot className="h-8 w-8 text-blue-500" /> :
                       detailEkskul.name.toLowerCase().includes('dance') || detailEkskul.name.toLowerCase().includes('tari') ? <Compass className="h-8 w-8 text-pink-500" /> :
                       detailEkskul.name.toLowerCase().includes('choir') || detailEkskul.name.toLowerCase().includes('paduan') ? <Mic className="h-8 w-8 text-indigo-500" /> :
                       <Activity className="h-8 w-8 text-emerald-500" />}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-extrabold text-zinc-900 dark:text-white">{detailEkskul.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50">
                          {detailEkskul.status === 'active' ? 'Aktif' : 'Baru'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{detailEkskul.description || 'Tidak ada deskripsi.'}</p>
                      
                      <div className="grid grid-cols-2 gap-y-1 gap-x-4 pt-2 text-xs text-zinc-650 dark:text-zinc-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Pembimbing: <strong>{detailEkskul.coach_name}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Jadwal: <strong>{detailEkskul.schedule_day || '—'}, {detailEkskul.schedule_time || '—'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Tempat: <strong>{detailEkskul.venue || '—'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shirt className="h-3.5 w-3.5 text-zinc-400" />
                          <span>Seragam: <strong>{detailEkskul.uniform || '—'}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Terdaftar', value: `${detailEkskulMembers.length} siswa`, desc: `Maksimal: ${detailEkskul.max_capacity || 20}`, color: 'blue' },
                      { label: 'Rasio Kehadiran', value: '94%', desc: 'Kehadiran sesi teraktual', color: 'emerald' },
                      { label: 'Rata-rata Progress', value: detailEkskul.avg_progress || 'Level 3', desc: 'Tingkatan siswa', color: 'amber' },
                      { label: 'Prestasi Juara', value: `${detailEkskul.competitions_won || 0}`, desc: 'Tingkat Kota & Provinsi', color: 'indigo' }
                    ].map(stat => (
                      <div key={stat.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">{stat.label}</span>
                        <span className={`text-xl font-extrabold text-${stat.color}-600 dark:text-${stat.color}-400 block`}>{stat.value}</span>
                        <span className="text-[10px] text-zinc-400 font-medium mt-1">{stat.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Members List Table */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <h5 className="font-extrabold text-zinc-800 dark:text-white text-base">Daftar Anggota Ekskul</h5>
                        <p className="text-[10px] text-zinc-450 font-medium">Mengelola {detailEkskulMembers.length} siswa terdaftar aktif</p>
                      </div>
                    </div>

                    <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                      <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <th className="px-6 py-4">Nama Siswa</th>
                          <th className="px-6 py-4">Kelas</th>
                          <th className="px-6 py-4">Tingkat Progress</th>
                          <th className="px-6 py-4">Kehadiran</th>
                          <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                        {detailEkskulMembers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-zinc-450">
                              Belum ada anggota yang terdaftar di ekskul ini.
                            </td>
                          </tr>
                        ) : (
                          detailEkskulMembers.map((m: any, idx: number) => {
                            const initials = m.student_name ? m.student_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'S';
                            const colorClasses = [
                              'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
                              'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400',
                              'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400',
                            ];
                            const initialsColor = colorClasses[idx % colorClasses.length];

                            return (
                              <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                                <td className="px-6 py-3.5 flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${initialsColor}`}>
                                    {initials}
                                  </div>
                                  <div>
                                    <span className="font-bold text-zinc-900 dark:text-white block leading-tight">{m.student_name}</span>
                                    <span className="text-[10px] text-zinc-450">NIS: {m.nis}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 font-semibold text-zinc-700 dark:text-zinc-350">Kelas {m.class_name}</td>
                                <td className="px-6 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    m.progress_level.includes('Advanced') 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400'
                                      : 'bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400'
                                  }`}>
                                    {m.progress_level}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                                      <div className="h-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${m.attendance_rate || 100}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-300">{m.attendance_rate || 100}%</span>
                                  </div>
                                </td>
                                <td className="px-6 py-3.5 text-right">
                                  {/* Delete membership */}
                                  <DeleteButton action={handleEkskul} confirmMessage={`Keluarkan ${m.student_name} dari ekskul ini?`}>
                                    <input type="hidden" name="actionType" value="remove_member" />
                                    <input type="hidden" name="studentId" value={m.student_id} />
                                    <input type="hidden" name="ekskulId" value={detailEkskul.id} />
                                  </DeleteButton>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right 1/3 Content: Action Buttons & Catalog Summary */}
                <div className="flex flex-col gap-6">
                  {/* Action Card */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs space-y-4">
                    <h5 className="font-extrabold text-zinc-800 dark:text-white text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 uppercase tracking-wider">Aksi Kelompok</h5>
                    
                    <Link
                      href={`/dashboard/admin?tab=ekskuls&ekskulEditId=${detailEkskul.id}`}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-bold text-center block shadow-xs transition-colors cursor-pointer"
                    >
                      Edit Club Info
                    </Link>

                    <a
                      href={`/api/ekskuls/print?id=${detailEkskul.id}`}
                      target="_blank"
                      className="w-full py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded-xl text-xs font-bold text-center block transition-colors"
                    >
                      Print Member List
                    </a>

                    <div className="pt-2">
                      <DeleteButton action={handleEkskul} confirmMessage={`HAPUS PERMANEN ekstrakurikuler "${detailEkskul.name}"? Ini akan menghapus semua data terkait.`}>
                        <input type="hidden" name="actionType" value="delete" />
                        <input type="hidden" name="ekskulId" value={detailEkskul.id} />
                        <input type="hidden" name="name" value={detailEkskul.name} />
                        <span className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold text-center block rounded-xl border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 transition-colors">
                          Hapus Ekskul
                        </span>
                      </DeleteButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: CATALOG GRID VIEW */}
          {!ekskulEditId && !detailEkskulId && (
            <div className="flex flex-col gap-6">
              {/* Header block with Add New Action */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">Extracurricular Catalog</h3>
                  <p className="text-sm text-zinc-500">Manage and explore all after-school activities available for SD Maju Jaya students.</p>
                </div>
                <Link
                  href="/dashboard/admin?tab=ekskuls&ekskulEditId=new"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add New Activity
                </Link>
              </div>

              {/* Stat card & Promotion banner */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Total Kegiatan</span>
                  <span className="text-3xl font-extrabold text-blue-600 dark:text-indigo-400 block mt-2">{extracurriculars.length} Klub</span>
                  <span className="text-xs text-zinc-450 mt-1 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    +3 dari semester lalu
                  </span>
                </div>

                <div className="md:col-span-2 bg-blue-600 dark:bg-indigo-650 text-white p-6 rounded-2xl shadow-xs flex flex-col justify-between">
                  <div>
                    <h5 className="font-extrabold text-base mb-1">Registration Open!</h5>
                    <p className="text-xs text-blue-100 dark:text-indigo-150 leading-relaxed">The Robotics and Football clubs are currently accepting new enrollments for the upcoming semester. Ensure all student data is updated.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-200 mt-2 block">SD Maju Jaya Admin System</span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {extracurriculars.map((e: any) => {
                  const getIcon = (name: string) => {
                    const l = name.toLowerCase();
                    if (l.includes('scout') || l.includes('pramuka')) return <Tent className="h-6 w-6 text-amber-500" />;
                    if (l.includes('robot')) return <Bot className="h-6 w-6 text-blue-500" />;
                    if (l.includes('dance') || l.includes('tari')) return <Compass className="h-6 w-6 text-pink-500" />;
                    if (l.includes('choir') || l.includes('paduan')) return <Mic className="h-6 w-6 text-indigo-500" />;
                    return <Activity className="h-6 w-6 text-emerald-500" />;
                  };

                  return (
                    <div key={e.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850 flex items-center justify-center">
                            {getIcon(e.name)}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50">
                            ACTIVE
                          </span>
                        </div>

                        {/* Card Body */}
                        <h4 className="font-extrabold text-zinc-900 dark:text-white text-base leading-tight mb-3">{e.name}</h4>
                        
                        <div className="space-y-2 text-xs text-zinc-650 dark:text-zinc-400 font-medium">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span>{e.schedule_day || '—'}, {e.schedule_time || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span>Coach: <strong>{e.coach_name}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                            <span>{e.venue || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="border-t border-zinc-100 dark:border-zinc-800 mt-5 pt-4 flex items-center justify-between gap-2">
                        {/* Enrolled Badge */}
                        <div className="flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold flex items-center justify-center">
                            {e.enrolled_count || '0'}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Anggota</span>
                        </div>

                        <Link
                          href={`/dashboard/admin?tab=ekskuls&detailEkskulId=${e.id}`}
                          className="text-xs font-bold text-blue-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Details →
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Dashed Add Card */}
                <Link
                  href="/dashboard/admin?tab=ekskuls&ekskulEditId=new"
                  className="bg-zinc-50/50 dark:bg-zinc-950/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all cursor-pointer min-h-[220px]"
                >
                  <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-450 shrink-0">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="font-extrabold text-zinc-800 dark:text-white text-xs block leading-tight">Add New Activity</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Propose a new extracurricular club</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- STUDENT PROFILES TAB --- */}
      {tab === 'students' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Monitoring Data Siswa</h3>
                <p className="text-sm text-zinc-500">Kelola informasi akademik dan kehadiran siswa SD Maju Jaya secara real-time.</p>
              </div>
              <Link 
                href={`/api/students/export?search=${encodeURIComponent(stuSearch)}&grade=${stuGrade}&status=${stuStatus}`}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-750 transition-colors w-fit shrink-0"
              >
                <Download className="h-4 w-4" />
                Ekspor Data
              </Link>
            </div>

            {/* Filter Bar & Search Container */}
            <div className="grid md:grid-cols-2 gap-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              {/* Left: Pilih Jenjang Kelas */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pilih Jenjang Kelas</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Semua', val: '' },
                    { label: 'Kelas 1', val: '1' },
                    { label: 'Kelas 2', val: '2' },
                    { label: 'Kelas 3', val: '3' },
                    { label: 'Kelas 4', val: '4' },
                    { label: 'Kelas 5', val: '5' },
                    { label: 'Kelas 6', val: '6' }
                  ].map((pill) => {
                    const isActive = stuGrade === pill.val;
                    return (
                      <Link
                        key={pill.label}
                        href={`/dashboard/admin?tab=students&grade=${pill.val}&search=${encodeURIComponent(stuSearch)}&status=${stuStatus}&page=1`}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          isActive 
                            ? 'bg-blue-600 border-blue-600 text-white dark:bg-indigo-600 dark:border-indigo-600 shadow-sm'
                            : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-400 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {pill.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Right: Search & Status dropdown form */}
              <form method="GET" action="/dashboard/admin" className="flex flex-col gap-2">
                <input type="hidden" name="tab" value="students" />
                {stuGrade && <input type="hidden" name="grade" value={stuGrade} />}
                
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status Keaktifan & Pencarian</span>
                <div className="flex gap-2">
                  <AutoSubmitSelect
                    name="status"
                    defaultValue={stuStatus}
                    options={[
                      { value: 'all', label: 'Semua Status' },
                      { value: 'active', label: 'Aktif Belajar' },
                      { value: 'inactive', label: 'Tidak Aktif' }
                    ]}
                    className="px-3 py-2 text-xs rounded-xl border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-750 dark:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      name="search"
                      defaultValue={stuSearch}
                      placeholder="Cari nama atau NIS/NISN..."
                      className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-zinc-250 dark:border-zinc-850 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer">
                    Cari
                  </button>
                </div>
              </form>
            </div>

            {/* Students Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Nama Siswa</th>
                    <th className="px-6 py-4">NISN</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Rata-Rata Nilai</th>
                    <th className="px-6 py-4">Status Absensi</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-450">
                        Tidak ada data siswa yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    students.map((s: any, idx: number) => {
                      const initials = s.full_name ? s.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'S';
                      const colorClasses = [
                        'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400',
                        'bg-pink-100 text-pink-800 dark:bg-pink-950/40 dark:text-pink-400',
                        'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400',
                      ];
                      const initialsColor = colorClasses[idx % colorClasses.length];

                      // Average grade styling
                      const avgGradeVal = s.avg_grade !== null ? Number(s.avg_grade) : 0;
                      const barColor = avgGradeVal >= 75
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'bg-amber-700 dark:bg-amber-600';
                      const textColor = avgGradeVal >= 75
                        ? 'text-emerald-600 dark:text-emerald-450'
                        : 'text-amber-700 dark:text-amber-450';

                      // Attendance status helper
                      const getAttendancePill = (status: string) => {
                        switch (status) {
                          case 'present':
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50">Hadir</span>;
                          case 'permission':
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-450 border border-amber-250 dark:border-amber-900/50">Izin</span>;
                          case 'sick':
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-850 dark:bg-pink-950/30 dark:text-pink-450 border border-pink-200 dark:border-pink-900/50">Sakit</span>;
                          case 'absent':
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-450 border border-red-200 dark:border-red-900/50">Alpa</span>;
                          case 'late':
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-850 dark:bg-orange-950/30 dark:text-orange-450 border border-orange-200 dark:border-orange-900/50">Terlambat</span>;
                          default:
                            return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">—</span>;
                        }
                      };

                      return (
                        <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${initialsColor}`}>
                              {initials}
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-white truncate">{s.full_name}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-500">{s.nisn || '-'}</td>
                          <td className="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-350">Kelas {s.class_name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shrink-0">
                                <div className={`h-full ${barColor}`} style={{ width: `${avgGradeVal}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${textColor}`}>{s.avg_grade !== null ? s.avg_grade : '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getAttendancePill(s.latest_attendance_status)}
                          </td>
                          <td className="px-6 py-4 text-right flex justify-end gap-1.5">
                            <Link 
                              href={`/dashboard/admin?tab=students&search=${encodeURIComponent(stuSearch)}&grade=${stuGrade}&status=${stuStatus}&page=${stuPage}&detailStudentId=${s.id}`} 
                              title="Review Profil"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-400 transition-colors"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                            <Link 
                              href={`/dashboard/admin?tab=students&search=${encodeURIComponent(stuSearch)}&grade=${stuGrade}&status=${stuStatus}&page=${stuPage}&editId=${s.id}`} 
                              title="Edit Profil"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-400 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Link>
                            <a 
                              href={`/api/students/print?id=${s.id}`}
                              target="_blank"
                              title="Cetak Profil"
                              className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-400 transition-colors"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Pagination Footer */}
              {totalStudentsCount > 0 && (() => {
                const totalPages = Math.ceil(totalStudentsCount / stuLimit);
                const startIdx = stuOffset + 1;
                const endIdx = Math.min(stuOffset + stuLimit, totalStudentsCount);

                return (
                  <div className="px-6 py-4 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs">
                    <span className="text-zinc-500 font-medium">
                      Menampilkan {startIdx}-{endIdx} dari {totalStudentsCount} siswa
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Prev Button */}
                      {stuPage > 1 ? (
                        <Link
                          href={`/dashboard/admin?tab=students&grade=${stuGrade}&search=${encodeURIComponent(stuSearch)}&status=${stuStatus}&page=${stuPage - 1}`}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="p-1.5 rounded-lg border border-zinc-150 dark:border-zinc-850 text-zinc-350 dark:text-zinc-700 cursor-not-allowed">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {/* Numbers */}
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNum = i + 1;
                        const isCurrent = stuPage === pageNum;
                        return (
                          <Link
                            key={pageNum}
                            href={`/dashboard/admin?tab=students&grade=${stuGrade}&search=${encodeURIComponent(stuSearch)}&status=${stuStatus}&page=${pageNum}`}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isCurrent
                                ? 'bg-blue-600 text-white dark:bg-indigo-600 shadow-sm'
                                : 'border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {pageNum}
                          </Link>
                        );
                      })}

                      {/* Next Button */}
                      {stuPage * stuLimit < totalStudentsCount ? (
                        <Link
                          href={`/dashboard/admin?tab=students&grade=${stuGrade}&search=${encodeURIComponent(stuSearch)}&status=${stuStatus}&page=${stuPage + 1}`}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-600 dark:text-zinc-400"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="p-1.5 rounded-lg border border-zinc-150 dark:border-zinc-850 text-zinc-350 dark:text-zinc-700 cursor-not-allowed">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Add/Edit Form (Keep completely unchanged according to rule 4) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Murid' : 'Tambah Murid Baru'}
            </h3>
            <form action={handleStudent} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="studentId" value={editItem.id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nomor Induk Siswa (NIS) *</label>
                <input type="text" name="nis" required defaultValue={editItem?.nis || ''} placeholder="NIS (unik)" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">NISN</label>
                <input type="text" name="nisn" defaultValue={editItem?.nisn || ''} placeholder="10 Digit NIS Nasional" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Lengkap Murid *</label>
                <input type="text" name="full_name" required defaultValue={editItem?.full_name || ''} placeholder="Nama Lengkap" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Pilih Kelas *</label>
                <select name="class_id" required defaultValue={editItem?.class_id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Kelas --</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name} (Tingkat {c.grade_level})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Jenis Kelamin</label>
                <select name="gender" defaultValue={editItem?.gender || 'male'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Tanggal Lahir</label>
                <input type="date" name="birth_date" defaultValue={editItem?.birth_date ? new Date(editItem.birth_date).toISOString().split('T')[0] : ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nomor HP Orang Tua</label>
                <input type="text" name="parent_phone" defaultValue={editItem?.parent_phone || ''} placeholder="08xxxxxxxxxx" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Alamat</label>
                <textarea name="address" defaultValue={editItem?.address || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Daftar Murid'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=students" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>

          {/* Review Profile Modal overlay */}
          {detailStudent && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
              <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{detailStudent.full_name}</h3>
                    <p className="text-xs text-zinc-500">NIS: {detailStudent.nis} | NISN: {detailStudent.nisn || '-'}</p>
                  </div>
                  <Link
                    href={`/dashboard/admin?tab=students&search=${encodeURIComponent(stuSearch)}&grade=${stuGrade}&status=${stuStatus}&page=${stuPage}`}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-650 dark:hover:text-zinc-250 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </Link>
                </div>
                
                {/* Modal Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 text-zinc-700 dark:text-zinc-300">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">Kelas</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">Kelas {detailStudent.class_name}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">Jenis Kelamin</span>
                      <span>{detailStudent.gender === 'female' ? 'Perempuan' : 'Laki-laki'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">Tanggal Lahir</span>
                      <span>{detailStudent.birth_date ? new Date(detailStudent.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">No. HP Orang Tua</span>
                      <span>{detailStudent.parent_phone || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-zinc-400 block uppercase font-semibold">Alamat</span>
                      <span>{detailStudent.address || '-'}</span>
                    </div>
                  </div>

                  {/* Grades summary & detail list */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Evaluasi Akademik</h4>
                    {detailStudentGrades.length === 0 ? (
                      <p className="text-sm text-zinc-500 italic">Belum ada data nilai.</p>
                    ) : (
                      <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
                            <tr>
                              <th className="px-4 py-2.5">Mapel</th>
                              <th className="px-4 py-2.5">Tipe</th>
                              <th className="px-4 py-2.5">Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {detailStudentGrades.map((g: any, i: number) => (
                              <tr key={i}>
                                <td className="px-4 py-2.5 font-medium">{g.subject_name}</td>
                                <td className="px-4 py-2.5">{g.type === 'assignment' ? 'Tugas' : g.type === 'midterm' ? 'UTS' : 'UAS'}</td>
                                <td className="px-4 py-2.5 font-bold">{g.score}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Attendance Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Ringkasan Kehadiran</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: 'Hadir', count: detailStudentAttSummary.present, color: 'emerald' },
                        { label: 'Izin', count: detailStudentAttSummary.permission, color: 'blue' },
                        { label: 'Sakit', count: detailStudentAttSummary.sick, color: 'amber' },
                        { label: 'Alpa', count: detailStudentAttSummary.absent, color: 'red' },
                        { label: 'Terlambat', count: detailStudentAttSummary.late, color: 'orange' },
                      ].map(item => (
                        <div key={item.label} className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-850 text-center">
                          <span className="text-[10px] font-bold text-zinc-400 block uppercase">{item.label}</span>
                          <span className="text-sm font-bold text-zinc-800 dark:text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-950/20">
                  <a
                    href={`/api/students/print?id=${detailStudent.id}`}
                    target="_blank"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Cetak Profil
                  </a>
                  <Link
                    href={`/dashboard/admin?tab=students&search=${encodeURIComponent(stuSearch)}&grade=${stuGrade}&status=${stuStatus}&page=${stuPage}`}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 text-xs font-bold rounded-xl"
                  >
                    Tutup
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {/* --- STAFF ACCOUNTS TAB (Principal, Teachers, Coaches, Parents) --- */}
      {tab === 'staff' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Akun Kepala Sekolah (Kepsek)</h3>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Nama</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">NIP / NUPTK</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {principal ? (
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-bold">{principal.name}</td>
                        <td className="px-6 py-4">{principal.email}</td>
                        <td className="px-6 py-4 text-zinc-500 text-xs font-mono">
                          NIP: {principal.nip || '-'}<br />NUPTK: {principal.nuptk || '-'}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Link href={`/dashboard/admin?tab=staff&editId=${principal.user_id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-zinc-400">Belum ada akun Kepala Sekolah</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Akun Guru</h3>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Nama Guru</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">NUPTK</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {teachers.map((t) => (
                      <tr key={t.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-bold">{t.name}</td>
                        <td className="px-6 py-4">{t.email}</td>
                        <td className="px-6 py-4 font-mono text-xs">{t.nuptk || '-'}</td>
                        <td className="px-6 py-4"><span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-450">{t.employment_status || 'Honorer'}</span></td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Link href={`/dashboard/admin?tab=staff&editId=${t.user_id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <DeleteButton action={handleStaff} confirmMessage="Yakin ingin menghapus guru ini?">
                            <input type="hidden" name="actionType" value="delete" />
                            <input type="hidden" name="userId" value={t.user_id} />
                          </DeleteButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Akun Pelatih / Pembimbing (Coach)</h3>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Nama Pelatih</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Bidang Keahlian</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {coaches.map((c) => (
                      <tr key={c.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-bold">{c.name}</td>
                        <td className="px-6 py-4">{c.email}</td>
                        <td className="px-6 py-4 text-pink-600 font-semibold">{c.expertise_field || '-'}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Link href={`/dashboard/admin?tab=staff&editId=${c.user_id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <DeleteButton action={handleStaff} confirmMessage="Yakin ingin menghapus pelatih ini?">
                            <input type="hidden" name="actionType" value="delete" />
                            <input type="hidden" name="userId" value={c.user_id} />
                          </DeleteButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Akun Wali Murid (Parent)</h3>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Nama Wali</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Anak (Murid)</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {parents.map((p) => (
                      <tr key={p.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-bold">{p.name}</td>
                        <td className="px-6 py-4">{p.email}</td>
                        <td className="px-6 py-4 text-blue-600 font-semibold">{p.student_name}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <Link href={`/dashboard/admin?tab=staff&editId=${p.user_id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                            <Edit2 className="h-4 w-4" />
                          </Link>
                          <DeleteButton action={handleStaff} confirmMessage="Yakin ingin menghapus wali murid ini?">
                            <input type="hidden" name="actionType" value="delete" />
                            <input type="hidden" name="userId" value={p.user_id} />
                          </DeleteButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Akun Staf/Wali' : 'Tambah Akun Baru'}
            </h3>
            <form action={handleStaff} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="userId" value={editItem.user_id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Lengkap *</label>
                <input type="text" name="name" required defaultValue={editItem?.name || ''} placeholder="Nama Lengkap" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Email *</label>
                <input type="email" name="email" required defaultValue={editItem?.email || ''} placeholder="email@sekolah.sch.id" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Kata Sandi {editItem ? '(Kosongkan jika tidak diganti)' : '*'}</label>
                <input type="password" name="password" {...(!editItem && { required: true })} placeholder="Min. 6 Karakter" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">No. Telepon / HP</label>
                <input type="text" name="phone" defaultValue={editItem?.phone || ''} placeholder="08xxxxxxxxxx" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Peran Akun *</label>
                <select name="role" required defaultValue={editItem?.role || 'teacher'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="principal">Kepala Sekolah</option>
                  <option value="teacher">Guru</option>
                  <option value="coach">Pelatih Ekskul (Coach)</option>
                  <option value="parent">Wali Murid</option>
                </select>
              </div>

              {/* Conditional Profile Fields */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex flex-col gap-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Detail Profil Tambahan (Sesuai Peran)</span>
                
                {/* Teacher / Principal fields */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">NUPTK (Guru/Kepsek)</label>
                  <input type="text" name="nuptk" defaultValue={editItem?.nuptk || ''} placeholder="16 Digit NUPTK" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">NIP (PNS/PPPK)</label>
                  <input type="text" name="nip" defaultValue={editItem?.nip || ''} placeholder="18 Digit NIP" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Status Pegawai (Guru)</label>
                  <select name="employment_status" defaultValue={editItem?.employment_status || 'Honorer'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="Honorer">Honorer</option>
                    <option value="Swasta">Swasta</option>
                  </select>
                </div>

                {/* Coach Fields */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Bidang Keahlian (Coach)</label>
                  <input type="text" name="expertise_field" defaultValue={editItem?.expertise_field || ''} placeholder="Contoh: Musik, Sepakbola" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Sertifikasi (Coach)</label>
                  <input type="text" name="certification" defaultValue={editItem?.certification || ''} placeholder="Nama Lisensi / Sertifikat" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>

                {/* Parent Fields */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Hubungkan Anak (Untuk Wali Murid)</label>
                  <select name="student_id" defaultValue={editItem?.student_id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                    <option value="">-- Pilih Nama Anak --</option>
                    {students.map((s: any) => <option key={s.id} value={s.id}>{s.full_name} (NIS: {s.nis})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Pekerjaan (Orang Tua)</label>
                  <input type="text" name="occupation" defaultValue={editItem?.occupation || ''} placeholder="Pekerjaan Orang Tua" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Alamat Rumah (Orang Tua)</label>
                  <textarea name="address" defaultValue={editItem?.address || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>

                {/* Principal fields */}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Tanggal Mulai Menjabat (Kepsek)</label>
                  <input type="date" name="appointment_date" defaultValue={editItem?.appointment_date ? new Date(editItem.appointment_date).toISOString().split('T')[0] : ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                </div>
              </div>

              <button type="submit" className="mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Buat Akun'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=staff" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- STAFF ATTENDANCE HISTORY TAB --- */}
      {tab === 'attendance' && (
        <div className="flex flex-col gap-6">

          {/* Header */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Riwayat Kehadiran Staf</h3>
            <p className="text-xs text-zinc-500">Pantau riwayat kehadiran guru dan pelatih dalam rentang waktu yang dipilih.</p>
          </div>

          {/* Filter Bar */}
          <AttendanceFilterBar
            allStaff={allStaffForFilter as any[]}
            defaultStartDate={attStartDate}
            defaultEndDate={attEndDate}
            defaultFilterRole={attFilterRole}
            defaultFilterUserId={attFilterUserId}
          />

          {/* Summary Cards */}
          {staffAttendanceHistory.length > 0 && (() => {
            const presentCount = staffAttendanceHistory.filter(r => r.status === 'present').length;
            const sickCount = staffAttendanceHistory.filter(r => r.status === 'sick').length;
            const permCount = staffAttendanceHistory.filter(r => r.status === 'permission').length;
            const absentCount = staffAttendanceHistory.filter(r => r.status === 'absent').length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Hadir', count: presentCount, color: 'emerald' },
                  { label: 'Sakit', count: sickCount, color: 'amber' },
                  { label: 'Izin', count: permCount, color: 'blue' },
                  { label: 'Alpa', count: absentCount, color: 'red' },
                ].map(item => (
                  <div key={item.label} className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs`}>
                    <span className="text-xs font-bold text-zinc-400 uppercase block mb-1">{item.label}</span>
                    <span className={`text-3xl font-extrabold text-${item.color}-600 dark:text-${item.color}-400`}>{item.count}</span>
                    <span className="text-xs text-zinc-400 ml-1">sesi</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* History Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-zinc-800 dark:text-white text-sm">
                {staffAttendanceHistory.length} Rekaman Kehadiran
              </span>
              <span className="text-xs text-zinc-400">{attStartDate} s/d {attEndDate}</span>
            </div>
            {staffAttendanceHistory.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-sm">
                Tidak ada data kehadiran untuk filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-3">Tanggal</th>
                      <th className="px-6 py-3">Nama Staf</th>
                      <th className="px-6 py-3">Peran</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {staffAttendanceHistory.map((rec: any, idx: number) => {
                      const statusMap: Record<string, { label: string; cls: string }> = {
                        present:    { label: 'Hadir',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
                        sick:       { label: 'Sakit',  cls: 'bg-amber-100  text-amber-700  dark:bg-amber-950/40  dark:text-amber-400'  },
                        permission: { label: 'Izin',   cls: 'bg-blue-100   text-blue-700   dark:bg-blue-950/40   dark:text-blue-400'   },
                        absent:     { label: 'Alpa',   cls: 'bg-red-100    text-red-700    dark:bg-red-950/40    dark:text-red-400'    },
                        late:       { label: 'Terlambat', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400' },
                      };
                      const s = statusMap[rec.status] ?? { label: rec.status, cls: 'bg-zinc-100 text-zinc-600' };
                      return (
                        <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-6 py-3 font-mono text-xs text-zinc-500">
                            {new Date(rec.session_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3 font-semibold text-zinc-900 dark:text-white">{rec.user_name}</td>
                          <td className="px-6 py-3 text-xs font-semibold uppercase text-zinc-400">
                            {rec.role_name === 'teacher' ? 'Guru' : 'Pelatih'}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.cls}`}>
                              {s.label}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-xs text-zinc-500 italic">{rec.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
