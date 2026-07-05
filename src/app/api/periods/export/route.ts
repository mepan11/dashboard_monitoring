import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const [periods] = await pool.query('SELECT * FROM academic_periods ORDER BY academic_year DESC, semester ASC') as any[];

    // Define CSV Headers
    const headers = [
      'ID',
      'Nama Periode',
      'Tahun Ajaran',
      'Semester',
      'Status Aktif',
      'Mulai Pembelajaran',
      'Akhir Semester',
      'Ujian Tengah Semester (UTS)',
      'Ujian Akhir Semester (UAS)',
      'Status Kalender'
    ];

    const rows = periods.map((p: any) => {
      const semStr = p.semester === 1 ? 'Ganjil' : 'Genap';
      const activeStr = p.is_active ? 'Aktif' : 'Tidak Aktif';
      const utsStr = p.midterm_start_date && p.midterm_end_date ? `${p.midterm_start_date} s/d ${p.midterm_end_date}` : '—';
      const uasStr = p.final_start_date && p.final_end_date ? `${p.final_start_date} s/d ${p.final_end_date}` : '—';
      const releaseStr = p.is_released ? 'Rilis' : 'Draft';

      return [
        p.id,
        p.name,
        p.academic_year,
        semStr,
        activeStr,
        p.start_date || '—',
        p.end_date || '—',
        utsStr,
        uasStr,
        releaseStr
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any[]) => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Return CSV with UTF-8 BOM
    const BOM = '\uFEFF';
    return new NextResponse(BOM + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=kalender-akademik.csv',
      },
    });

  } catch (error: any) {
    console.error('Export academic periods error:', error);
    return new NextResponse(`Error exporting periods: ${error.message}`, { status: 500 });
  }
}
