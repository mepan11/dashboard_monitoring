import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const grade = searchParams.get('grade') || '';
    const status = searchParams.get('status') || 'active'; // Default active

    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push('(s.full_name LIKE ? OR s.nis LIKE ? OR s.nisn LIKE ?)');
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch, likeSearch);
    }

    if (grade) {
      conditions.push('c.grade_level = ?');
      queryParams.push(parseInt(grade, 10));
    }

    if (status === 'active') {
      conditions.push('s.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('s.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        s.nis, 
        s.nisn, 
        s.full_name, 
        c.name as class_name, 
        s.gender, 
        s.birth_date, 
        s.address, 
        s.parent_phone, 
        IF(s.is_active, 'Aktif Belajar', 'Tidak Aktif') as status_keaktifan,
        (SELECT ROUND(AVG(score), 1) FROM grades WHERE student_id = s.id) as avg_grade,
        (
          SELECT ar.status 
          FROM attendance_records ar
          JOIN attendance_sessions asess ON ar.session_id = asess.id
          WHERE ar.student_id = s.id
          ORDER BY asess.session_date DESC, asess.id DESC
          LIMIT 1
        ) as latest_attendance_status
      FROM student_profiles s
      JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY c.grade_level ASC, c.name ASC, s.full_name ASC
    `;

    const [rows] = await pool.query(query, queryParams) as any[];

    // Map English gender and attendance status to Indonesian
    const genderMap: Record<string, string> = { male: 'Laki-laki', female: 'Perempuan' };
    const attendanceMap: Record<string, string> = {
      present: 'Hadir',
      sick: 'Sakit',
      permission: 'Izin',
      absent: 'Alpa',
      late: 'Terlambat'
    };

    // Header row
    const headers = [
      'NIS',
      'NISN',
      'Nama Lengkap',
      'Kelas',
      'Jenis Kelamin',
      'Tanggal Lahir',
      'Alamat',
      'No. HP Orang Tua',
      'Status Keaktifan',
      'Rata-rata Nilai',
      'Status Absensi Terakhir'
    ];

    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const formattedRow = [
        `"${(row.nis || '').replace(/"/g, '""')}"`,
        `"${(row.nisn || '').replace(/"/g, '""')}"`,
        `"${(row.full_name || '').replace(/"/g, '""')}"`,
        `"${(row.class_name || '').replace(/"/g, '""')}"`,
        `"${genderMap[row.gender] || row.gender || '-'}"`,
        `"${row.birth_date ? new Date(row.birth_date).toISOString().split('T')[0] : '-'}"`,
        `"${(row.address || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(row.parent_phone || '').replace(/"/g, '""')}"`,
        `"${row.status_keaktifan}"`,
        `"${row.avg_grade !== null ? row.avg_grade : '-'}"`,
        `"${attendanceMap[row.latest_attendance_status] || 'Belum Absen'}"`
      ];
      csvRows.push(formattedRow.join(','));
    }

    // Include BOM for UTF-8 compatibility in Excel
    const csvContent = '\uFEFF' + csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="data_siswa_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
