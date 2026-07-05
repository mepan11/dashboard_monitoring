import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (classId) {
      // Export students of specific class
      const [classNameRows] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]) as any[];
      const className = classNameRows.length > 0 ? classNameRows[0].name : `ID_${classId}`;

      const [students] = await pool.query(`
        SELECT nis, nisn, full_name, gender, is_active
        FROM student_profiles
        WHERE class_id = ?
        ORDER BY full_name ASC
      `, [classId]) as any[];

      const headers = ['No', 'Nama Siswa', 'NIS', 'NISN', 'Jenis Kelamin', 'Status Keaktifan'];
      const rows = students.map((s: any, idx: number) => [
        idx + 1,
        s.full_name,
        s.nis,
        s.nisn || '—',
        s.gender === 'male' ? 'Laki-laki' : 'Perempuan',
        s.is_active ? 'Aktif' : 'Non-aktif'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const BOM = '\uFEFF';
      return new NextResponse(BOM + csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="daftar_siswa_kelas_${className}.csv"`,
        },
      });
    }

    const [classes] = await pool.query(`
      SELECT c.id, c.name, c.grade_level, u.name as homeroom_teacher_name,
             (SELECT COUNT(*) FROM student_profiles sp WHERE sp.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.homeroom_teacher_id = u.id
      ORDER BY c.grade_level ASC, c.name ASC
    `) as any[];

    // CSV header and content conversion
    const headers = ['ID Kelas', 'Nama Kelas', 'Tingkatan (Grade)', 'Wali Kelas', 'Jumlah Siswa'];
    const rows = classes.map((c: any) => [
      c.id,
      c.name,
      `Kelas ${c.grade_level}`,
      c.homeroom_teacher_name || 'Belum Ditentukan',
      c.student_count
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    // Add UTF-8 BOM for correct character encoding in Excel
    const BOM = '\uFEFF';
    return new NextResponse(BOM + csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="daftar_kelas_sd_maju_jaya.csv"',
      },
    });

  } catch (error: any) {
    console.error('Export classes error:', error);
    return NextResponse.json({ error: `Failed to export classes: ${error.message}` }, { status: 500 });
  }
}
