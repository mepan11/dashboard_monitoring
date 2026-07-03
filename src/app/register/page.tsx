import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '../../lib/db';
import { hashPassword } from '../../lib/auth';
import { setSession } from '../../lib/session';
import { BookOpen, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Register Wali Murid - E-Monitor SD',
  description: 'Daftar akun mandiri wali murid.',
};

export default async function RegisterPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const errorMsg = searchParams.error;

  // Fetch active students for selection
  const [studentsRows] = await pool.query(
    'SELECT id, full_name, nis FROM student_profiles WHERE is_active = TRUE ORDER BY full_name ASC'
  );
  const students = studentsRows as any[];

  async function registerAction(formData: FormData) {
    'use server';

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phone = formData.get('phone') as string;
    const occupation = formData.get('occupation') as string;
    const address = formData.get('address') as string;
    const studentIdStr = formData.get('student_id') as string;

    if (!name || !email || !password || !studentIdStr) {
      redirect('/register?error=Semua field yang bertanda bintang (*) wajib diisi');
    }

    const studentId = parseInt(studentIdStr, 10);
    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
      // Check if email already exists
      const [existingUsers] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
      if ((existingUsers as any[]).length > 0) {
        redirect('/register?error=Email sudah terdaftar di sistem');
      }

      // 1. Get role ID for parent
      const [roles] = await conn.query('SELECT id FROM roles WHERE name = "parent"');
      const roleId = (roles as any[])[0].id;

      // 2. Hash password
      const passwordHash = hashPassword(password);

      // 3. Insert user record
      const [userRes] = await conn.query(
        'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, phone || null]
      );
      const userId = (userRes as any).insertId;

      // 4. Insert user role mapping
      await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

      // 5. Insert parent profile mapping to selected student
      await conn.query(
        'INSERT INTO parent_profiles (user_id, occupation, address, student_id) VALUES (?, ?, ?, ?)',
        [userId, occupation || null, address || null, studentId]
      );

      await conn.commit();

      // Set session & redirect
      await setSession({
        userId,
        name,
        email,
        role: 'parent',
      });

      redirect('/dashboard/parent');
    } catch (err: any) {
      await conn.rollback();
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        throw err;
      }
      console.error('Registration error:', err);
      redirect('/register?error=Pendaftaran gagal. Silakan coba lagi.');
    } finally {
      conn.release();
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-6">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 justify-center">
          <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
            Pendaftaran Wali Murid
          </h1>
        </div>

        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Buat akun Wali Murid baru secara mandiri dan hubungkan langsung dengan profil anak Anda.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form action={registerAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nama Lengkap Anda *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Contoh: Budi Hartono"
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Alamat Email *
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="email@anda.com"
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Kata Sandi *
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Min. 6 Karakter"
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nomor Telepon / HP
            </label>
            <input
              type="text"
              name="phone"
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Pekerjaan
            </label>
            <input
              type="text"
              name="occupation"
              placeholder="Contoh: Pegawai Swasta, Wiraswasta"
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Pilih Anak Anda (Murid) *
            </label>
            <select
              name="student_id"
              required
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            >
              <option value="">-- Pilih Nama Anak --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name} (NIS: {student.nis})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Alamat Rumah Lengkap
            </label>
            <textarea
              name="address"
              rows={2}
              placeholder="Tuliskan alamat lengkap rumah..."
              className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
            />
          </div>

          <div className="md:col-span-2 mt-4">
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/15 active:shadow-none transition-all duration-200 cursor-pointer"
            >
              Daftar & Masuk ke Dashboard
            </button>
          </div>
        </form>

        <div className="text-center text-sm border-t border-zinc-150 dark:border-zinc-800 pt-4">
          <span className="text-zinc-500 dark:text-zinc-400">Sudah memiliki akun? </span>
          <Link href="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            Masuk di sini
          </Link>
        </div>

      </div>
    </div>
  );
}
