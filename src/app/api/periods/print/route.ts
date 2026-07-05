import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const [periods] = await pool.query('SELECT * FROM academic_periods ORDER BY academic_year DESC, semester ASC') as any[];

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Kalender Akademik - SD Maju Jaya</title>
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
    .status-badge {
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
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
    <button class="btn-print" onclick="window.print()">Cetak Kalender Akademik</button>
  </div>

  <div class="header">
    <h1>SD Maju Jaya</h1>
    <p>Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan | Telp: (021) 7654321</p>
  </div>

  <div class="title">Kalender Akademik & Jadwal Semester</div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%;">Tahun Ajaran</th>
        <th style="width: 15%;">Semester</th>
        <th>Mulai Pembelajaran</th>
        <th>Ujian Tengah Semester</th>
        <th>Ujian Akhir Semester</th>
        <th>Akhir Semester</th>
        <th style="width: 12%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${periods.map((p: any) => {
        const semStr = p.semester === 1 ? 'Ganjil' : 'Genap';
        const utsStr = p.midterm_start_date && p.midterm_end_date 
          ? new Date(p.midterm_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(p.midterm_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';
        const uasStr = p.final_start_date && p.final_end_date 
          ? new Date(p.final_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + new Date(p.final_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';
        
        const startStr = p.start_date ? new Date(p.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
        const endStr = p.end_date ? new Date(p.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
        
        let statusText = 'Arsip';
        if (p.is_active) statusText = 'Aktif';
        else if (!p.is_released) statusText = 'Draft';
        else if (new Date(p.start_date) > new Date()) statusText = 'Mendatang';

        return `
          <tr>
            <td><strong>${p.academic_year}</strong></td>
            <td>Semester ${semStr}</td>
            <td>${startStr}</td>
            <td>${utsStr}</td>
            <td>${uasStr}</td>
            <td>${endStr}</td>
            <td style="text-align: center;">
              <span class="status-badge">${statusText}</span>
            </td>
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
    console.error('Print periods error:', error);
    return new NextResponse(`Error printing academic periods: ${error.message}`, { status: 500 });
  }
}
