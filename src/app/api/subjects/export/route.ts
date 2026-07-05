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
    `) as any[];

    // Group assignments by subject_id
    const assignmentsMap: { [key: number]: string[] } = {};
    assignments.forEach((a: any) => {
      if (!assignmentsMap[a.subject_id]) {
        assignmentsMap[a.subject_id] = [];
      }
      assignmentsMap[a.subject_id].push(`${a.class_name}: ${a.teacher_name}`);
    });

    // Define CSV Headers
    const headers = [
      'ID',
      'Kode Pelajaran',
      'Nama Pelajaran',
      'Kategori',
      'Target Kelas (Tingkatan)',
      'Jam Pelajaran / Minggu',
      'Daftar Kelas & Pengajar'
    ];

    const rows = subjects.map((s: any) => {
      const classTeachers = assignmentsMap[s.id] ? assignmentsMap[s.id].join('; ') : '—';
      
      return [
        s.id,
        s.code,
        s.name,
        s.category || 'Academic',
        s.grade_level || '1-6',
        s.weekly_hours || 4,
        classTeachers
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
        'Content-Disposition': 'attachment; filename=daftar-mata-pelajaran.csv',
      },
    });

  } catch (error: any) {
    console.error('Export subjects error:', error);
    return new NextResponse(`Error exporting subjects: ${error.message}`, { status: 500 });
  }
}
