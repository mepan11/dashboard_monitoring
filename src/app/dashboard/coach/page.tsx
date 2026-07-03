import { redirect } from 'next/navigation';
import pool from '../../../lib/db';
import { getSession } from '../../../lib/session';
import { 
  getEkskulsByCoach, getEkskulLogs, createEkskulLog, getEkskulAttendance, recordEkskulAttendance
} from '../../../lib/services/ekskulService';
import { 
  getStaffAttendanceForDate, recordStaffAttendance, getStaffSelfAttendanceHistory 
} from '../../../lib/services/attendanceService';
import { Award, CheckSquare, FileText, Check, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Toast } from '../../../components/ui/Toast';
import { AutoSubmitSelect } from '../../../components/ui/AutoSubmitSelect';
import { isRedirectError } from 'next/dist/client/components/redirect-error';

export const metadata = {
  title: 'Coach Dashboard - E-Monitor SD',
};

export default async function CoachDashboard(props: {
  searchParams: Promise<{
    tab?: string;
    ekskulId?: string;
    date?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || session.role !== 'coach') {
    redirect('/login');
  }

  const searchParams = await props.searchParams;
  const tab = searchParams.tab || 'overview';
  const errorMsg = searchParams.error;
  const successMsg = searchParams.success;

  const selEkskulId = searchParams.ekskulId ? parseInt(searchParams.ekskulId, 10) : null;
  const selDate = searchParams.date || new Date().toISOString().split('T')[0];

  // Fetch coach's managed extracurriculars
  const myEkskuls = await getEkskulsByCoach(session.userId);

  // --- ACTIONS FOR MUTATIONS ---

  async function handleSaveEkskulAttendance(formData: FormData) {
    'use server';
    const ekskulId = formData.get('ekskulId') as string;
    const date = formData.get('date') as string;
    
    // Get all student ids
    const studentIds = formData.getAll('student_ids').map(id => parseInt(id as string, 10));
    
    const records = studentIds.map(studentId => {
      const status = formData.get(`status_${studentId}`) as any;
      const notes = formData.get(`notes_${studentId}`) as string;
      return { studentId, status, notes };
    });

    try {
      await recordEkskulAttendance(
        parseInt(ekskulId, 10),
        date,
        records,
        session!.userId
      );
      redirect(`/dashboard/coach?tab=attendance&ekskulId=${ekskulId}&date=${date}&success=Absensi ekskul berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/coach?tab=attendance&ekskulId=${ekskulId}&date=${date}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
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
      redirect(`/dashboard/coach?tab=attendance&date=${date}&success=Absensi mandiri berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/coach?tab=attendance&date=${date}&error=${encodeURIComponent(err.message || 'Gagal menyimpan absensi')}`);
    }
  }

  async function handleSaveEkskulLog(formData: FormData) {
    'use server';
    const ekskulId = parseInt(formData.get('ekskul_id') as string, 10);
    const date = formData.get('date') as string;
    const activityName = formData.get('activity_name') as string;
    const description = formData.get('description') as string;

    try {
      await createEkskulLog(ekskulId, date, activityName, description);
      redirect(`/dashboard/coach?tab=logs&ekskulId=${ekskulId}&success=Laporan ekskul berhasil disimpan`);
    } catch (err: any) {
      if (isRedirectError(err)) {
        throw err;
      }
      redirect(`/dashboard/coach?tab=logs&ekskulId=${ekskulId}&error=${encodeURIComponent(err.message || 'Gagal menyimpan laporan')}`);
    }
  }

  // --- FETCH DATA FOR ACTIVE TAB ---
  let stats = null;
  let selfAttendanceHistory = [];
  let selfAttendanceToday = null;
  let ekskulStudents = [];
  let logsList = [];

  if (myEkskuls.length > 0) {
    const activeEkskulId = selEkskulId || myEkskuls[0].id;

    if (tab === 'overview') {
      const logs = await getEkskulLogs(activeEkskulId);
      stats = {
        ekskuls: myEkskuls.length,
        logs: logs.length
      };
      selfAttendanceHistory = await getStaffSelfAttendanceHistory(session.userId);
    } else if (tab === 'attendance') {
      ekskulStudents = await getEkskulAttendance(activeEkskulId, selDate);
      
      const staffAtt = await getStaffAttendanceForDate(selDate);
      selfAttendanceToday = staffAtt.records.find(r => r.user_id === session.userId);
    } else if (tab === 'logs') {
      logsList = await getEkskulLogs(activeEkskulId);
    }
  }

  if (myEkskuls.length === 0) {
    return (
      <div className="bg-amber-50 text-amber-800 p-6 border border-amber-200 rounded-2xl">
        Anda belum terdaftar sebagai pelatih di kegiatan ekstrakurikuler mana pun. Silakan hubungi Super Admin.
      </div>
    );
  }

  const activeEkskulId = selEkskulId || myEkskuls[0].id;

  return (
    <div className="flex flex-col gap-6">
      {successMsg && <Toast message={decodeURIComponent(successMsg)} type="success" />}
      {errorMsg && <Toast message={decodeURIComponent(errorMsg)} type="error" />}

      {/* --- OVERVIEW TAB --- */}
      {tab === 'overview' && stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 rounded-xl">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Ekskul Dibina</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.ekskuls}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs flex items-center gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <span className="text-zinc-400 text-xs font-semibold block uppercase">Laporan Kegiatan</span>
                <span className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.logs} Laporan</span>
              </div>
            </div>
          </div>

          {/* Self Daily Attendance History */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Riwayat Kehadiran Anda</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Keterangan</th>
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

      {/* --- EKSKUL ATTENDANCE TAB --- */}
      {tab === 'attendance' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Absensi Kehadiran Murid Ekskul</h3>
                <p className="text-xs text-zinc-500 mt-1">Lakukan absensi untuk siswa peserta kegiatan ekstrakurikuler.</p>
              </div>
              <form method="GET" action="/dashboard/coach" className="flex items-center gap-2">
                <input type="hidden" name="tab" value="attendance" />
                <select name="ekskulId" defaultValue={activeEkskulId} className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {myEkskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input type="date" name="date" required defaultValue={selDate} className="px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-750 rounded-lg text-sm font-bold cursor-pointer">Muat</button>
              </form>
            </div>

            <form action={handleSaveEkskulAttendance}>
              <input type="hidden" name="ekskulId" value={activeEkskulId} />
              <input type="hidden" name="date" value={selDate} />
              
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="px-6 py-4">Nama Murid</th>
                      <th className="px-6 py-4">Kelas</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {ekskulStudents.map((rec) => (
                      <tr key={rec.student_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                        <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                          {rec.student_name}
                          <input type="hidden" name="student_ids" value={rec.student_id} />
                        </td>
                        <td className="px-6 py-4">{rec.class_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {[
                              { value: 'present', label: 'Hadir' },
                              { value: 'absent', label: 'Absen' },
                              { value: 'excused', label: 'Izin' }
                            ].map((opt) => (
                              <label key={opt.value} className="flex items-center gap-1 cursor-pointer select-none text-xs">
                                <input 
                                  type="radio" 
                                  name={`status_${rec.student_id}`}
                                  value={opt.value}
                                  defaultChecked={rec.status === opt.value}
                                  className="accent-indigo-650 h-4 w-4"
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text" 
                            name={`notes_${rec.student_id}`}
                            defaultValue={rec.notes || ''}
                            placeholder="Keterangan sakit/izin..."
                            className="w-full px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button type="submit" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/15 cursor-pointer">
                  Simpan Absensi Murid Ekskul
                </button>
              </div>
            </form>
          </div>

          {/* Coach Self Attendance Panel */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 h-fit shadow-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Absensi Mandiri Coach</h3>
            <p className="text-xs text-zinc-400 mb-4">Laporkan kehadiran harian Anda sebagai coach untuk tanggal yang dipilih.</p>
            
            {/* Date loader GET form */}
            <form method="GET" action="/dashboard/coach" className="mb-4">
              <input type="hidden" name="tab" value="attendance" />
              <div>
                <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Pilih Tanggal Kehadiran</label>
                <div className="flex gap-2">
                  <input type="date" name="date" required defaultValue={selDate} className="flex-1 px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
                  <button type="submit" className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-xs font-bold cursor-pointer">
                    Muat
                  </button>
                </div>
              </div>
            </form>

            <form action={handleSaveSelfAttendance} className="flex flex-col gap-4">
              <input type="hidden" name="date" value={selDate} />
              <div>
                <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Status Kehadiran</label>
                <select name="self_status" required defaultValue={selfAttendanceToday?.status || 'present'} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  <option value="present">Hadir</option>
                  <option value="sick">Sakit</option>
                  <option value="permission">Izin</option>
                  <option value="absent">Alpa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-450 mb-1 uppercase">Keterangan / Catatan</label>
                <textarea name="self_notes" defaultValue={selfAttendanceToday?.notes || ''} placeholder="Tulis catatan jika ada..." className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs" />
              </div>
              
              <button type="submit" className="mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                Simpan Kehadiran Saya
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EKSKUL LOGS TAB --- */}
      {tab === 'logs' && (
        <div className="grid lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Jurnal Riwayat Latihan Ekskul</h3>
              <form method="GET" action="/dashboard/coach" className="flex items-center gap-2">
                <input type="hidden" name="tab" value="logs" />
                <AutoSubmitSelect
                  name="ekskulId"
                  defaultValue={activeEkskulId}
                  options={myEkskuls.map(e => ({ value: e.id, label: e.name }))}
                  className="px-3 py-1.5 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-medium"
                />
              </form>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm text-zinc-700 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold uppercase text-zinc-650 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Aktivitas Latihan</th>
                    <th className="px-6 py-4">Keterangan / Hasil Latihan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {logsList.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50">
                      <td className="px-6 py-4 font-semibold whitespace-nowrap">
                        {new Date(log.activity_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{log.activity_name}</td>
                      <td className="px-6 py-4 text-xs text-zinc-500 leading-relaxed max-w-xs">{log.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Input Log Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 h-fit shadow-xs">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Input Laporan Kegiatan</h3>
            <form action={handleSaveEkskulLog} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Pilih Kegiatan Ekskul *</label>
                <select name="ekskul_id" required defaultValue={activeEkskulId} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm">
                  {myEkskuls.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Tanggal Kegiatan *</label>
                <input type="date" name="date" required defaultValue={selDate} className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Nama Kegiatan / Materi *</label>
                <input type="text" name="activity_name" required placeholder="Contoh: Pemberian Materi Morse, Uji Coba Lari" className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Deskripsi / Hasil Rekap Latihan *</label>
                <textarea name="description" required rows={4} placeholder="Tuliskan detail aktivitas latihan dan hasil evaluasi..." className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-950 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs" />
              </div>
              <button type="submit" className="mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-xs cursor-pointer">
                Simpan Jurnal Latihan
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
