import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Student ID is required', { status: 400 });
    }

    const studentId = parseInt(id, 10);

    // 1. Get student profile details
    const [students] = await pool.query(`
      SELECT s.*, c.name as class_name, c.grade_level
      FROM student_profiles s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `, [studentId]) as any[];

    if (students.length === 0) {
      return new NextResponse('Student not found', { status: 404 });
    }

    const student = students[0];

    // 2. Get grades summary
    const [grades] = await pool.query(`
      SELECT g.score, g.type, g.notes, sub.name as subject_name, sub.code as subject_code
      FROM grades g
      JOIN subjects sub ON g.subject_id = sub.id
      WHERE g.student_id = ?
    `, [studentId]) as any[];

    // Calculate average
    const avgScore = grades.length > 0
      ? (grades.reduce((sum: number, g: any) => sum + Number(g.score), 0) / grades.length).toFixed(1)
      : '-';

    // 3. Get attendance summary (counts)
    const [attStats] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM attendance_records
      WHERE student_id = ?
      GROUP BY status
    `, [studentId]) as any[];

    const attSummary: Record<string, number> = { present: 0, sick: 0, permission: 0, absent: 0, late: 0 };
    for (const stat of attStats) {
      if (stat.status in attSummary) {
        attSummary[stat.status] = stat.count;
      }
    }

    const genderLabel = student.gender === 'female' ? 'Perempuan' : 'Laki-laki';
    const birthDateLabel = student.birth_date
      ? new Date(student.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Profil Siswa - ${student.full_name}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        color: #000;
        background-color: #fff;
      }
      .no-print {
        display: none !important;
      }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 10px;
      margin-bottom: 25px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 12px;
      color: #666;
    }
    .title {
      text-align: center;
      text-decoration: underline;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 20px;
      text-transform: uppercase;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .info-table td {
      padding: 6px;
      vertical-align: top;
      font-size: 14px;
    }
    .info-table td.label {
      width: 25%;
      font-weight: bold;
    }
    .info-table td.divider {
      width: 2%;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
      font-size: 13px;
    }
    .data-table th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .attendance-box {
      display: flex;
      justify-content: space-around;
      border: 1px solid #000;
      padding: 10px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    .attendance-item {
      text-align: center;
    }
    .attendance-item .num {
      font-size: 18px;
      font-weight: bold;
      display: block;
    }
    .attendance-item .lbl {
      font-size: 11px;
      color: #555;
    }
    .footer-sign {
      margin-top: 50px;
      float: right;
      width: 250px;
      text-align: center;
      font-size: 14px;
    }
    .footer-sign .space {
      height: 70px;
    }
    .btn-print {
      background-color: #4f46e5;
      color: #fff;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>

  <div class="no-print" style="text-align: center;">
    <button class="btn-print" onclick="window.print()">Cetak Dokumen ini</button>
  </div>

  <div class="header">
    <h1>SD Maju Jaya</h1>
    <p>Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan | Telp: (021) 7654321</p>
  </div>

  <div class="title">Biodata & Laporan Evaluasi Siswa</div>

  <table class="info-table">
    <tr>
      <td class="label">Nama Lengkap</td>
      <td class="divider">:</td>
      <td>${student.full_name}</td>
      <td class="label">Kelas</td>
      <td class="divider">:</td>
      <td>Kelas ${student.class_name} (Tingkat ${student.grade_level})</td>
    </tr>
    <tr>
      <td class="label">NIS / NISN</td>
      <td class="divider">:</td>
      <td>${student.nis} / ${student.nisn || '-'}</td>
      <td class="label">Jenis Kelamin</td>
      <td class="divider">:</td>
      <td>${genderLabel}</td>
    </tr>
    <tr>
      <td class="label">Tanggal Lahir</td>
      <td class="divider">:</td>
      <td>${birthDateLabel}</td>
      <td class="label">Status Keaktifan</td>
      <td class="divider">:</td>
      <td>${student.is_active ? 'Aktif Belajar' : 'Tidak Aktif'}</td>
    </tr>
    <tr>
      <td class="label">No. HP Orang Tua</td>
      <td class="divider">:</td>
      <td>${student.parent_phone || '-'}</td>
      <td class="label">Alamat Rumah</td>
      <td class="divider">:</td>
      <td>${student.address || '-'}</td>
    </tr>
  </table>

  <div class="section-title">Evaluasi Akademik</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Mata Pelajaran</th>
        <th>Tipe Evaluasi</th>
        <th>Nilai</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${grades.length > 0 ? grades.map((g: any) => `
        <tr>
          <td>${g.subject_name} (${g.subject_code})</td>
          <td>${g.type === 'assignment' ? 'Tugas' : g.type === 'midterm' ? 'UTS' : 'UAS'}</td>
          <td><strong>${g.score}</strong></td>
          <td>${g.notes || '-'}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="4" style="text-align: center; color: #777;">Belum ada data nilai akademik.</td>
        </tr>
      `}
      <tr>
        <td colspan="2" style="text-align: right; font-weight: bold;">Rata-Rata Nilai Keseluruhan:</td>
        <td colspan="2"><strong>${avgScore}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">Ringkasan Kehadiran Harian</div>
  <div class="attendance-box">
    <div class="attendance-item">
      <span class="num" style="color: green;">${attSummary.present}</span>
      <span class="lbl">Hadir</span>
    </div>
    <div class="attendance-item">
      <span class="num" style="color: blue;">${attSummary.permission}</span>
      <span class="lbl">Izin</span>
    </div>
    <div class="attendance-item">
      <span class="num" style="color: orange;">${attSummary.sick}</span>
      <span class="lbl">Sakit</span>
    </div>
    <div class="attendance-item">
      <span class="num" style="color: red;">${attSummary.absent}</span>
      <span class="lbl">Alpa</span>
    </div>
    <div class="attendance-item">
      <span class="num" style="color: darkorange;">${attSummary.late}</span>
      <span class="lbl">Terlambat</span>
    </div>
  </div>

  <div class="footer-sign">
    <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>Kepala Sekolah,</p>
    <div class="space"></div>
    <p><strong>Dr. H. Ahmad</strong></p>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print dialogue in 500ms
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error('Print error:', error);
    return new NextResponse(`Error printing student profile: ${error.message}`, { status: 500 });
  }
}
