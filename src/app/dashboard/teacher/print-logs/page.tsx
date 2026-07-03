import { redirect } from 'next/navigation';
import { getSession } from '../../../../lib/session';
import { getLessonLogsByTeacher } from '../../../../lib/services/ekskulService';

export const metadata = {
  title: 'Jurnal Mengajar - Cetak Laporan',
};

export default async function PrintLogsPage() {
  const session = await getSession();
  if (!session || session.role !== 'teacher') {
    redirect('/login');
  }

  const logs = await getLessonLogsByTeacher(session.userId);

  return (
    <div className="bg-white text-black p-8 font-sans min-h-screen">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Document Header */}
        <div className="text-center border-b-4 border-double border-black pb-4">
          <h1 className="text-2xl font-black uppercase tracking-wide">Jurnal Mengajar Harian Guru</h1>
          <h2 className="text-lg font-bold uppercase mt-1">Sekolah Dasar (SD) E-Monitor</h2>
          <p className="text-xs text-zinc-500 mt-2">Laporan Resmi Aktivitas Pengajaran Staf Pendidik</p>
        </div>

        {/* Metadata Panel */}
        <div className="grid grid-cols-2 gap-4 text-sm font-medium border-b border-zinc-300 pb-4">
          <div>
            <span>Nama Guru: </span>
            <span className="font-bold">{session.name}</span>
          </div>
          <div className="text-right">
            <span>Tanggal Cetak: </span>
            <span className="font-bold">{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div>
            <span>Email Staf: </span>
            <span className="font-mono text-xs">{session.email}</span>
          </div>
          <div className="text-right">
            <span>Total Jurnal: </span>
            <span className="font-bold">{logs.length} Pertemuan</span>
          </div>
        </div>

        {/* Table List */}
        <div className="mt-4">
          <table className="w-full text-left text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-zinc-100 border-b border-black font-bold uppercase text-[10px]">
                <th className="px-3 py-2 border-r border-black w-28">Waktu & Durasi</th>
                <th className="px-3 py-2 border-r border-black w-36">Kelas / Pelajaran</th>
                <th className="px-3 py-2 border-r border-black w-44">Materi Pelajaran</th>
                <th className="px-3 py-2">Rangkuman / Ringkasan</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-400">
                    <td className="px-3 py-2.5 border-r border-black font-mono">
                      {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })}<br/>
                      {log.start_time.slice(0, 5)} - {log.end_time.slice(0, 5)}<br/>
                      ({log.duration_minutes} Menit)
                    </td>
                    <td className="px-3 py-2.5 border-r border-black">
                      <span className="font-bold block">Kelas {log.class_name}</span>
                      <span className="text-[10px] text-zinc-650">{log.subject_name}</span>
                    </td>
                    <td className="px-3 py-2.5 border-r border-black font-semibold">
                      {log.topic}
                    </td>
                    <td className="px-3 py-2.5 leading-relaxed text-zinc-800">
                      {log.summary}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-zinc-500 italic">Belum ada jurnal mengajar tercatat.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-4 mt-16 text-sm text-center">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-20" />
            <p className="font-bold underline">Dr. H. Ahmad</p>
            <p className="text-xs text-zinc-500 font-mono">NIP. 197508122000031002</p>
          </div>
          <div>
            <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Guru Pengajar</p>
            <div className="h-20" />
            <p className="font-bold underline">{session.name}</p>
            <p className="text-xs text-zinc-500 font-mono">Staf Pendidik SD</p>
          </div>
        </div>

        {/* Client Print script */}
        <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />

      </div>
    </div>
  );
}
