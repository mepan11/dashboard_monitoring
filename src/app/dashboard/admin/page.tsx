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
  getStaffAttendanceForDate, recordStaffAttendance 
} from '../../../lib/services/attendanceService';
import { 
  Users, BookOpen, Calendar, Award, CheckSquare,
  Plus, Edit2, Trash2, ShieldAlert, Check
} from 'lucide-react';
import Link from 'next/link';
import { DeleteButton } from '../../../components/ui/DeleteButton';
import { Toast } from '../../../components/ui/Toast';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const metadata = {
  title: 'Super Admin Dashboard - E-Monitor SD',
};

export default async function AdminDashboard(props: {
  searchParams: Promise<{ tab?: string; date?: string; error?: string; success?: string; editId?: string }>;
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

  async function handleSubject(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const subjectId = formData.get('subjectId') as string;
    const code = formData.get('code') as string;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const gradeLevel = formData.get('grade_level') as string;
    const isCore = formData.get('is_core') === 'true';
    const description = formData.get('description') as string;

    try {
      if (actionType === 'delete') {
        await deleteSubject(parseInt(subjectId, 10));
        redirect('/dashboard/admin?tab=subjects&success=Mata pelajaran berhasil dihapus');
      } else if (subjectId) {
        await updateSubject(parseInt(subjectId, 10), code, name, category, gradeLevel, isCore, description);
        redirect('/dashboard/admin?tab=subjects&success=Mata pelajaran berhasil diperbarui');
      } else {
        await createSubject(code, name, category, gradeLevel, isCore, description);
        redirect('/dashboard/admin?tab=subjects&success=Mata pelajaran berhasil dibuat');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=subjects&error=${encodeURIComponent(err.message || 'Gagal menyimpan mata pelajaran')}`);
    }
  }

  async function handlePeriod(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const periodId = formData.get('periodId') as string;
    const name = formData.get('name') as string;
    const academicYear = formData.get('academic_year') as string;
    const semester = parseInt(formData.get('semester') as string, 10);
    const isActive = formData.get('is_active') === 'true';
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;

    try {
      if (actionType === 'delete') {
        await deleteAcademicPeriod(parseInt(periodId, 10));
        redirect('/dashboard/admin?tab=periods&success=Periode akademik berhasil dihapus');
      } else if (periodId) {
        await updateAcademicPeriod(parseInt(periodId, 10), name, academicYear, semester, isActive, startDate, endDate);
        redirect('/dashboard/admin?tab=periods&success=Periode akademik berhasil diperbarui');
      } else {
        await createAcademicPeriod(name, academicYear, semester, isActive, startDate, endDate);
        redirect('/dashboard/admin?tab=periods&success=Periode akademik berhasil dibuat');
      }
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/admin?tab=periods&error=${encodeURIComponent(err.message || 'Gagal menyimpan periode akademik')}`);
    }
  }

  async function handleEkskul(formData: FormData) {
    'use server';
    const actionType = formData.get('actionType') as string;
    const ekskulId = formData.get('ekskulId') as string;
    const name = formData.get('name') as string;
    const coachId = parseInt(formData.get('coach_id') as string, 10);
    const description = formData.get('description') as string;

    try {
      if (actionType === 'delete') {
        await deleteExtracurricular(parseInt(ekskulId, 10));
        redirect('/dashboard/admin?tab=ekskuls&success=Ekskul berhasil dihapus');
      } else if (ekskulId) {
        await updateExtracurricular(parseInt(ekskulId, 10), name, coachId, description);
        redirect('/dashboard/admin?tab=ekskuls&success=Ekskul berhasil diperbarui');
      } else {
        await createExtracurricular(name, coachId, description);
        redirect('/dashboard/admin?tab=ekskuls&success=Ekskul berhasil dibuat');
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

  // --- FETCH DATA FOR ACTIVE TAB ---

  let overviewData = null;
  let classes = [];
  let subjects = [];
  let periods = [];
  let extracurriculars = [];
  let students = [];
  
  // Staff accounts
  let teachers = [];
  let coaches = [];
  let parents = [];
  let principal = null;

  // Attendance
  let staffAttendance = null;

  const [teachersList] = (await pool.query('SELECT u.id, u.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = "teacher"')) as any;
  const [coachesList] = (await pool.query('SELECT u.id, u.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = "coach"')) as any;
  
  if (tab === 'overview') {
    const [cCount] = (await pool.query('SELECT COUNT(*) as count FROM classes')) as any;
    const [sCount] = (await pool.query('SELECT COUNT(*) as count FROM student_profiles')) as any;
    const [subCount] = (await pool.query('SELECT COUNT(*) as count FROM subjects')) as any;
    const [eCount] = (await pool.query('SELECT COUNT(*) as count FROM extracurriculars')) as any;
    const [uCount] = (await pool.query('SELECT COUNT(*) as count FROM users')) as any;
    overviewData = {
      classes: cCount[0].count,
      students: sCount[0].count,
      subjects: subCount[0].count,
      ekskuls: eCount[0].count,
      users: uCount[0].count,
    };
  } else if (tab === 'classes') {
    classes = await getClasses();
  } else if (tab === 'subjects') {
    subjects = await getSubjects();
  } else if (tab === 'periods') {
    periods = await getAcademicPeriods();
  } else if (tab === 'ekskuls') {
    extracurriculars = await getExtracurriculars();
  } else if (tab === 'students') {
    students = await getStudents();
    classes = await getClasses();
  } else if (tab === 'staff') {
    teachers = await getTeacherProfiles();
    coaches = await getCoachProfiles();
    parents = await getParentProfiles();
    principal = await getPrincipalProfile();
    const [stuRaw] = await pool.query('SELECT id, full_name, nis FROM student_profiles WHERE is_active = TRUE ORDER BY full_name ASC');
    students = stuRaw as any[];
  } else if (tab === 'attendance') {
    staffAttendance = await getStaffAttendanceForDate(currentDate);
  }

  // --- HELPERS FOR EDITING ---
  let editItem: any = null;
  if (editId) {
    const id = parseInt(editId, 10);
    if (tab === 'classes') editItem = classes.find(c => c.id === id);
    if (tab === 'subjects') editItem = subjects.find(s => s.id === id);
    if (tab === 'periods') editItem = periods.find(p => p.id === id);
    if (tab === 'ekskuls') editItem = extracurriculars.find(e => e.id === id);
    if (tab === 'students') editItem = students.find(s => s.id === id);
    if (tab === 'staff') {
      editItem = teachers.find(t => t.user_id === id) || 
                 coaches.find(c => c.user_id === id) || 
                 parents.find(p => p.user_id === id) || 
                 (principal && principal.user_id === id ? principal : null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {successMsg && <Toast message={decodeURIComponent(successMsg)} type="success" />}
      {errorMsg && <Toast message={decodeURIComponent(errorMsg)} type="error" />}

      {/* --- OVERVIEW PANEL --- */}
      {tab === 'overview' && overviewData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-zinc-400 text-xs font-semibold block uppercase">Total Murid</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewData.students}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-zinc-400 text-xs font-semibold block uppercase">Total Kelas</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewData.classes}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-zinc-400 text-xs font-semibold block uppercase">Mata Pelajaran</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewData.subjects}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-4 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-zinc-400 text-xs font-semibold block uppercase">Kegiatan Ekskul</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewData.ekskuls}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-zinc-400 text-xs font-semibold block uppercase">Pengguna Aktif</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{overviewData.users}</span>
            </div>
          </div>
        </div>
      )}

      {/* --- CLASSES TAB --- */}
      {tab === 'classes' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Daftar Kelas</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Nama Kelas</th>
                    <th className="px-6 py-4">Tingkatan (Grade)</th>
                    <th className="px-6 py-4">Wali Kelas</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {classes.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold">{c.name}</td>
                      <td className="px-6 py-4">Kelas {c.grade_level}</td>
                      <td className="px-6 py-4 text-indigo-600 dark:text-indigo-400 font-medium">{c.homeroom_teacher_name || 'Belum Ditentukan'}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link href={`/dashboard/admin?tab=classes&editId=${c.id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={handleClass} confirmMessage="Yakin ingin menghapus kelas ini?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="classId" value={c.id} />
                        </DeleteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>
            <form action={handleClass} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="classId" value={editItem.id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Kelas *</label>
                <input type="text" name="name" required defaultValue={editItem?.name || ''} placeholder="Contoh: 1A, 4B" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Tingkat Kelas (1-6) *</label>
                <select name="grade_level" required defaultValue={editItem?.grade_level || '1'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {[1,2,3,4,5,6].map(g => <option key={g} value={g}>Kelas {g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Guru Wali Kelas</label>
                <select name="homeroom_teacher_id" defaultValue={editItem?.homeroom_teacher_id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Tanpa Wali Kelas --</option>
                  {(teachersList as any[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Buat Kelas'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=classes" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- SUBJECTS TAB --- */}
      {tab === 'subjects' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Daftar Mata Pelajaran</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Kode</th>
                    <th className="px-6 py-4">Nama Pelajaran</th>
                    <th className="px-6 py-4">Kategori</th>
                    <th className="px-6 py-4">Tipe</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-mono font-bold text-indigo-650 dark:text-indigo-400">{s.code}</td>
                      <td className="px-6 py-4 font-medium">{s.name}</td>
                      <td className="px-6 py-4">{s.category || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.is_core ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/50'}`}>
                          {s.is_core ? 'Inti' : 'Muatan Lokal / Ekskul'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link href={`/dashboard/admin?tab=subjects&editId=${s.id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={handleSubject} confirmMessage="Yakin ingin menghapus mata pelajaran ini?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="subjectId" value={s.id} />
                        </DeleteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>
            <form action={handleSubject} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="subjectId" value={editItem.id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Kode Mapel *</label>
                <input type="text" name="code" required defaultValue={editItem?.code || ''} placeholder="Contoh: IPA, MTK, FUTSAL" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Pelajaran *</label>
                <input type="text" name="name" required defaultValue={editItem?.name || ''} placeholder="Contoh: Matematika, Futsal Ekskul" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Kategori</label>
                <input type="text" name="category" defaultValue={editItem?.category || ''} placeholder="Academic, Religion, ArtSport, Local" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Tingkat Kelas (misal: "1,2" atau "4,5,6" atau NULL)</label>
                <input type="text" name="grade_level" defaultValue={editItem?.grade_level || ''} placeholder="1-6" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Jenis Pelajaran *</label>
                <select name="is_core" required defaultValue={editItem ? String(editItem.is_core) : 'true'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="true">Pelajaran Inti (Akademik)</option>
                  <option value="false">Muatan Lokal / Ekstrakurikuler</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Deskripsi</label>
                <textarea name="description" defaultValue={editItem?.description || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Buat Mapel'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=subjects" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- ACADEMIC PERIODS TAB --- */}
      {tab === 'periods' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Daftar Semester / Tahun Ajaran</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Nama Periode</th>
                    <th className="px-6 py-4">Tahun Ajaran</th>
                    <th className="px-6 py-4">Semester</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {periods.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold">{p.name}</td>
                      <td className="px-6 py-4">{p.academic_year}</td>
                      <td className="px-6 py-4">Semester {p.semester === 1 ? '1 (Ganjil)' : '2 (Genap)'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50' : 'bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-950/20 dark:text-zinc-450 dark:border-zinc-900/50'}`}>
                          {p.is_active ? 'Aktif Saat Ini' : 'Tidak Aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link href={`/dashboard/admin?tab=periods&editId=${p.id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={handlePeriod} confirmMessage="Yakin ingin menghapus periode ini?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="periodId" value={p.id} />
                        </DeleteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Periode' : 'Tambah Periode Baru'}
            </h3>
            <form action={handlePeriod} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="periodId" value={editItem.id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Periode *</label>
                <input type="text" name="name" required defaultValue={editItem?.name || ''} placeholder="Contoh: 2025/2026 Ganjil" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Tahun Ajaran *</label>
                <input type="text" name="academic_year" required defaultValue={editItem?.academic_year || ''} placeholder="Contoh: 2025/2026" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Semester *</label>
                <select name="semester" required defaultValue={editItem?.semester || '1'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="1">Semester 1 (Ganjil)</option>
                  <option value="2">Semester 2 (Genap)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Status Aktif *</label>
                <select name="is_active" required defaultValue={editItem ? String(editItem.is_active) : 'false'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="true">Aktif (Aktifkan saat ini, nonaktifkan periode lain)</option>
                  <option value="false">Tidak Aktif</option>
                </select>
              </div>
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Buat Periode'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=periods" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- EXTRACURRICULARS TAB --- */}
      {tab === 'ekskuls' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Daftar Kegiatan Ekstrakurikuler</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Nama Ekskul</th>
                    <th className="px-6 py-4">Pembina / Pelatih (Coach)</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {extracurriculars.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold">{e.name}</td>
                      <td className="px-6 py-4 text-pink-600 dark:text-pink-400 font-medium">{e.coach_name}</td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{e.description || '-'}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link href={`/dashboard/admin?tab=ekskuls&editId=${e.id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={handleEkskul} confirmMessage="Yakin ingin menghapus ekskul ini?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="ekskulId" value={e.id} />
                        </DeleteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editItem ? 'Edit Ekskul' : 'Tambah Ekskul Baru'}
            </h3>
            <form action={handleEkskul} className="flex flex-col gap-4">
              {editItem && <input type="hidden" name="ekskulId" value={editItem.id} />}
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Nama Kegiatan Ekskul *</label>
                <input type="text" name="name" required defaultValue={editItem?.name || ''} placeholder="Pramuka, Futsal, Seni Tari" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Pembina / Pelatih *</label>
                <select name="coach_id" required defaultValue={editItem?.coach_id || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="">-- Pilih Coach --</option>
                  {(coachesList as any[]).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-zinc-700 dark:text-zinc-300">Keterangan / Deskripsi</label>
                <textarea name="description" defaultValue={editItem?.description || ''} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                {editItem ? 'Simpan Perubahan' : 'Buat Ekskul'}
              </button>
              {editItem && (
                <Link href="/dashboard/admin?tab=ekskuls" className="text-center text-xs text-zinc-500 hover:underline">
                  Batal Edit / Tambah Baru
                </Link>
              )}
            </form>
          </div>
        </div>
      )}

      {/* --- STUDENT PROFILES TAB --- */}
      {tab === 'students' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Daftar Murid</h3>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">NIS / NISN</th>
                    <th className="px-6 py-4">Nama Lengkap</th>
                    <th className="px-6 py-4">Kelas</th>
                    <th className="px-6 py-4">Kontak Orang Tua</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-mono text-zinc-500">
                        {s.nis} / <span className="text-xs">{s.nisn || '-'}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{s.full_name}</td>
                      <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-450">{s.class_name}</td>
                      <td className="px-6 py-4">{s.parent_phone || '-'}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link href={`/dashboard/admin?tab=students&editId=${s.id}`} className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <DeleteButton action={handleStudent} confirmMessage="Yakin ingin menghapus murid ini?">
                          <input type="hidden" name="actionType" value="delete" />
                          <input type="hidden" name="studentId" value={s.id} />
                        </DeleteButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Tingkat {c.grade_level})</option>)}
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
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name} (NIS: {s.nis})</option>)}
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

      {/* --- STAFF ATTENDANCE TAB (Super Admin inputs daily attendance for Teachers & Coaches) --- */}
      {tab === 'attendance' && staffAttendance && (
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Absensi Harian Guru & Staf (Pelatih)</h3>
              <p className="text-xs text-zinc-500 mt-1">Super Admin memiliki wewenang untuk memasukkan absensi harian staf pendidik.</p>
            </div>
            
            <form method="GET" action="/dashboard/admin" className="flex items-center gap-2">
              <input type="hidden" name="tab" value="attendance" />
              <input 
                type="date" 
                name="date" 
                defaultValue={currentDate} 
                className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white"
              />
              <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-semibold cursor-pointer">
                Pilih Tanggal
              </button>
            </form>
          </div>

          <form action={handleStaffAttendanceSave}>
            <input type="hidden" name="date" value={currentDate} />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Nama Staf</th>
                    <th className="px-6 py-4">Peran (Role)</th>
                    <th className="px-6 py-4">Status Kehadiran</th>
                    <th className="px-6 py-4">Catatan (Notes)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {staffAttendance.records.map((rec) => (
                    <tr key={rec.user_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-bold">
                        {rec.name}
                        <input type="hidden" name="user_ids" value={rec.user_id} />
                      </td>
                      <td className="px-6 py-4 font-semibold text-xs uppercase tracking-wider text-zinc-550 dark:text-zinc-450">
                        {rec.role_name === 'teacher' ? 'Guru' : 'Pelatih (Coach)'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {[
                            { value: 'present', label: 'Hadir' },
                            { value: 'sick', label: 'Sakit' },
                            { value: 'permission', label: 'Izin' },
                            { value: 'absent', label: 'Alpa' }
                          ].map((opt) => (
                            <label key={opt.value} className="flex items-center gap-1 cursor-pointer select-none">
                              <input 
                                type="radio" 
                                name={`status_${rec.user_id}`} 
                                value={opt.value}
                                defaultChecked={rec.status === opt.value}
                                className="accent-indigo-600 h-4 w-4"
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          name={`notes_${rec.user_id}`} 
                          defaultValue={rec.notes || ''}
                          placeholder="Tulis keterangan jika sakit/izin..."
                          className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button 
                type="submit" 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/15 cursor-pointer"
              >
                Simpan Absensi Harian Staf
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
