import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Fetch all academic subjects (filtered to exclude extracurriculars)
    const [subjects] = await pool.query(`
      SELECT * FROM subjects 
      ORDER BY is_core DESC, code ASC
    `) as any[];

    // Fetch all teacher subject assignments
    const [assignments] = await pool.query(`
      SELECT ts.subject_id, c.name as class_name, u.name as teacher_name
      FROM teacher_subjects ts
      JOIN classes c ON ts.class_id = c.id
      JOIN users u ON ts.teacher_id = u.id
      ORDER BY c.grade_level ASC, c.name ASC
    `) as any[];

    // Group assignments by subject_id
    const assignmentsMap: { [key: number]: string[] } = {};
    assignments.forEach((a: any) => {
      if (!assignmentsMap[a.subject_id]) {
        assignmentsMap[a.subject_id] = [];
      }
      assignmentsMap[a.subject_id].push(`${a.class_name}: ${a.teacher_name}`);
    });

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Daftar Mata Pelajaran - SD Maju Jaya</title>
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
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .data-table th, .data-table td {
      border: 1px solid #000;
      padding: 10px 8px;
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
    <button class="btn-print" onclick="window.print()">Cetak Daftar Pelajaran</button>
  </div>

  <div class="header">
    <h1>SD Maju Jaya</h1>
    <p>Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan | Telp: (021) 7654321</p>
  </div>

  <div class="title">Daftar Mata Pelajaran & Penugasan Pengajar Kurikulum</div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">No</th>
        <th style="width: 15%;">Kode</th>
        <th style="width: 25%;">Nama Pelajaran</th>
        <th style="width: 15%;">Kategori</th>
        <th style="width: 12%; text-align: center;">Jam / Minggu</th>
        <th>Kelas & Pengajar (Guru)</th>
      </tr>
    </thead>
    <tbody>
      ${subjects.map((s: any, idx: number) => {
        const classTeachers = assignmentsMap[s.id] ? assignmentsMap[s.id].join('; ') : '—';
        return `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td><strong>${s.code}</strong></td>
            <td>${s.name}</td>
            <td>${s.category || 'Academic'}</td>
            <td style="text-align: center;">${s.weekly_hours || 4} Jam</td>
            <td>${classTeachers}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer-sign">
    <p>Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>Kepala Sekolah SD Maju Jaya,</p>
    <div class="space"></div>
    <p><strong>Admin Utama, S.Pd.</strong></p>
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
    console.error('Print subjects error:', error);
    return new NextResponse(`Error printing subjects: ${error.message}`, { status: 500 });
  }
}
