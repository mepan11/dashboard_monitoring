import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '../../lib/db';
import { comparePassword } from '../../lib/auth';
import { setSession } from '../../lib/session';
import { BookOpen, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Login - Dashboard Monitoring Sekolah',
  description: 'Masuk ke dashboard monitoring sekolah dasar.',
};

export default async function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const errorMsg = searchParams.error;

  async function loginAction(formData: FormData) {
    'use server';

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      redirect('/login?error=Email dan password wajib diisi');
    }

    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.password_hash, r.name as role
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE u.email = ? AND u.is_active = TRUE`,
        [email]
      );

      const user = (rows as any[])[0];

      if (!user || !comparePassword(password, user.password_hash)) {
        redirect('/login?error=Email atau password salah');
      }

      // Set session
      await setSession({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      // Redirect based on role
      const getDashboardSlug = (r: string) => {
        switch (r) {
          case 'super_admin': return 'admin';
          case 'principal': return 'principal';
          case 'teacher': return 'teacher';
          case 'parent': return 'parent';
          case 'coach': return 'coach';
          default: return '';
        }
      };

      redirect(`/dashboard/${getDashboardSlug(user.role)}`);
    } catch (err: any) {
      if (err.message && err.message.includes('NEXT_REDIRECT')) {
        throw err;
      }
      console.error('Login error:', err);
      redirect('/login?error=Terjadi kesalahan sistem');
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-200 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Brand Card */}
        <div className="flex flex-col gap-6 text-center md:text-left p-4">
          <div className="inline-flex items-center gap-3 justify-center md:justify-start">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/25 text-white">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              E-Monitor SD
            </h1>
          </div>
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-400 leading-tight">
              Sistem Dashboard Monitoring Sekolah Dasar
            </h2>
            <p className="mt-4 text-zinc-650 dark:text-zinc-400 text-lg">
              Solusi digital terintegrasi untuk memantau kehadiran, pencapaian akademik, dan log kegiatan harian sekolah tingkat dasar (SD).
            </p>
          </div>

          {/* Quick Login Helper Panel */}
          <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 text-sm shadow-xs">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-3">Akun Demo (Uji Coba):</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold block text-indigo-600 dark:text-indigo-450">Super Admin</span>
                <span>admin@school.sch.id</span>
                <span className="block text-zinc-400 font-mono">admin123</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold block text-amber-600 dark:text-amber-450">Kepala Sekolah</span>
                <span>kepsek@school.sch.id</span>
                <span className="block text-zinc-400 font-mono">principal123</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold block text-emerald-600 dark:text-emerald-450">Guru IPA (Kelas 4)</span>
                <span>guru2@school.sch.id</span>
                <span className="block text-zinc-400 font-mono">teacher123</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold block text-blue-600 dark:text-blue-450">Wali Murid (Budi)</span>
                <span>ortu1@school.sch.id</span>
                <span className="block text-zinc-400 font-mono">parent123</span>
              </div>
              <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-900">
                <span className="font-semibold block text-pink-600 dark:text-pink-450">Coach Pramuka</span>
                <span>pelatih1@school.sch.id</span>
                <span className="block text-zinc-400 font-mono">coach123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Selamat Datang Kembali</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Masuk untuk mengakses monitoring sekolah Anda.</p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form action={loginAction} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="nama@sekolah.sch.id"
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/15 active:shadow-none transition-all duration-200 cursor-pointer"
            >
              Masuk Sekarang
            </button>
          </form>

          <div className="text-center text-sm border-t border-zinc-150 dark:border-zinc-800 pt-4">
            <span className="text-zinc-500 dark:text-zinc-400">Wali Murid belum punya akun? </span>
            <Link href="/register" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
              Daftar Mandiri
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
