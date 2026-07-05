import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Extracurricular ID is required', { status: 400 });
    }

    const ekskulId = parseInt(id, 10);

    // 1. Get extracurricular details
    const [ekskuls] = await pool.query(`
      SELECT e.*, u.name as coach_name
      FROM extracurriculars e
      JOIN users u ON e.coach_id = u.id
      WHERE e.id = ?
    `, [ekskulId]) as any[];

    if (ekskuls.length === 0) {
      return new NextResponse('Extracurricular not found', { status: 404 });
    }

    const ekskul = ekskuls[0];

    // 2. Get members
    const [members] = await pool.query(`
      SELECT em.progress_level, em.attendance_rate, sp.full_name as student_name, sp.nis, sp.nisn, c.name as class_name
      FROM ekskul_members em
      JOIN student_profiles sp ON em.student_id = sp.id
      JOIN classes c ON sp.class_id = c.id
      WHERE em.extracurricular_id = ?
      ORDER BY sp.full_name ASC
    `, [ekskulId]) as any[];

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Anggota Ekskul - ${ekskul.name}</title>
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

  <div class="title">Daftar Anggota Ekstrakurikuler</div>

  <table class="info-table">
    <tr>
      <td class="label">Nama Ekskul</td>
      <td class="divider">:</td>
      <td><strong>${ekskul.name}</strong></td>
      <td class="label">Kategori</td>
      <td class="divider">:</td>
      <td>${ekskul.category || '-'}</td>
    </tr>
    <tr>
      <td class="label">Pembina / Pelatih</td>
      <td class="divider">:</td>
      <td>${ekskul.coach_name}</td>
      <td class="label">Jadwal</td>
      <td class="divider">:</td>
      <td>${ekskul.schedule_day || '-'}, ${ekskul.schedule_time || '-'}</td>
    </tr>
    <tr>
      <td class="label">Tempat Latihan</td>
      <td class="divider">:</td>
      <td>${ekskul.venue || '-'}</td>
      <td class="label">Seragam</td>
      <td class="divider">:</td>
      <td>${ekskul.uniform || '-'}</td>
    </tr>
    <tr>
      <td class="label">Kapasitas Maksimal</td>
      <td class="divider">:</td>
      <td>${ekskul.max_capacity || '20'} siswa</td>
      <td class="label">Jumlah Anggota</td>
      <td class="divider">:</td>
      <td>${members.length} siswa</td>
    </tr>
  </table>

  <div class="section-title">Daftar Anggota Aktif</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">No</th>
        <th style="width: 15%;">NIS / NISN</th>
        <th>Nama Siswa</th>
        <th style="width: 12%;">Kelas</th>
        <th style="width: 25%;">Tingkat Progress</th>
        <th style="width: 15%; text-align: center;">Kehadiran</th>
      </tr>
    </thead>
    <tbody>
      ${members.length > 0 ? members.map((m: any, idx: number) => `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>${m.nis} / ${m.nisn || '-'}</td>
          <td><strong>${m.student_name}</strong></td>
          <td>Kelas ${m.class_name}</td>
          <td>${m.progress_level || '-'}</td>
          <td style="text-align: center;"><strong>${m.attendance_rate || '100'}%</strong></td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="6" style="text-align: center; color: #777;">Belum ada anggota terdaftar.</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="footer-sign">
    <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>Pembina Ekstrakurikuler,</p>
    <div class="space"></div>
    <p><strong>${ekskul.coach_name}</strong></p>
  </div>

  <script>
    window.onload = function() {
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
    console.error('Print members error:', error);
    return new NextResponse(`Error printing member list: ${error.message}`, { status: 500 });
  }
}
