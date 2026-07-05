import pool from '../db';

// --- Classes ---
export async function getClasses() {
  const [rows] = await pool.query(`
    SELECT c.id, c.name, c.grade_level, c.homeroom_teacher_id, c.is_active, u.name as homeroom_teacher_name
    FROM classes c
    LEFT JOIN users u ON c.homeroom_teacher_id = u.id
    ORDER BY c.grade_level ASC, c.name ASC
  `);
  return rows as any[];
}

export async function createClass(name: string, grade_level: number, homeroom_teacher_id: number | null) {
  const [res] = await pool.query(
    'INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES (?, ?, ?)',
    [name, grade_level, homeroom_teacher_id]
  );
  return (res as any).insertId;
}

export async function updateClass(id: number, name: string, grade_level: number, homeroom_teacher_id: number | null) {
  await pool.query(
    'UPDATE classes SET name = ?, grade_level = ?, homeroom_teacher_id = ? WHERE id = ?',
    [name, grade_level, homeroom_teacher_id, id]
  );
  return true;
}

export async function deleteClass(id: number) {
  await pool.query('DELETE FROM classes WHERE id = ?', [id]);
  return true;
}

// --- Subjects ---
export async function getSubjects() {
  const [rows] = await pool.query('SELECT * FROM subjects ORDER BY is_core DESC, code ASC');
  return rows as any[];
}

export async function createSubject(code: string, name: string, category: string | null, grade_level: string | null, is_core: boolean, description: string | null) {
  const [res] = await pool.query(
    'INSERT INTO subjects (code, name, category, grade_level, is_core, description) VALUES (?, ?, ?, ?, ?, ?)',
    [code, name, category, grade_level, is_core, description]
  );
  return (res as any).insertId;
}

export async function updateSubject(id: number, code: string, name: string, category: string | null, grade_level: string | null, is_core: boolean, description: string | null) {
  await pool.query(
    'UPDATE subjects SET code = ?, name = ?, category = ?, grade_level = ?, is_core = ?, description = ? WHERE id = ?',
    [code, name, category, grade_level, is_core, description, id]
  );
  return true;
}

export async function deleteSubject(id: number) {
  await pool.query('DELETE FROM subjects WHERE id = ?', [id]);
  return true;
}

// --- Academic Periods ---
export async function getAcademicPeriods() {
  const [rows] = await pool.query('SELECT * FROM academic_periods ORDER BY id DESC');
  return rows as any[];
}

export async function createAcademicPeriod(name: string, academic_year: string, semester: number, is_active: boolean, start_date: string | null, end_date: string | null) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    if (is_active) {
      // Deactivate all other periods first
      await conn.query('UPDATE academic_periods SET is_active = FALSE');
    }
    const [res] = await conn.query(
      'INSERT INTO academic_periods (name, academic_year, semester, is_active, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [name, academic_year, semester, is_active, start_date || null, end_date || null]
    );
    await conn.commit();
    return (res as any).insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateAcademicPeriod(id: number, name: string, academic_year: string, semester: number, is_active: boolean, start_date: string | null, end_date: string | null) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    if (is_active) {
      await conn.query('UPDATE academic_periods SET is_active = FALSE');
    }
    await conn.query(
      'UPDATE academic_periods SET name = ?, academic_year = ?, semester = ?, is_active = ?, start_date = ?, end_date = ? WHERE id = ?',
      [name, academic_year, semester, is_active, start_date || null, end_date || null, id]
    );
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteAcademicPeriod(id: number) {
  await pool.query('DELETE FROM academic_periods WHERE id = ?', [id]);
  return true;
}

// --- Extracurriculars ---
export async function getExtracurriculars() {
  const [rows] = await pool.query(`
    SELECT e.id, e.name, e.coach_id, e.description, e.is_active, u.name as coach_name
    FROM extracurriculars e
    JOIN users u ON e.coach_id = u.id
    ORDER BY e.name ASC
  `);
  return rows as any[];
}

export async function createExtracurricular(name: string, coach_id: number, description: string | null) {
  const [res] = await pool.query(
    'INSERT INTO extracurriculars (name, coach_id, description) VALUES (?, ?, ?)',
    [name, coach_id, description]
  );
  return (res as any).insertId;
}

export async function updateExtracurricular(id: number, name: string, coach_id: number, description: string | null) {
  await pool.query(
    'UPDATE extracurriculars SET name = ?, coach_id = ?, description = ? WHERE id = ?',
    [name, coach_id, description, id]
  );
  return true;
}

export async function deleteExtracurricular(id: number) {
  await pool.query('DELETE FROM extracurriculars WHERE id = ?', [id]);
  return true;
}

// --- Students ---
export async function getStudents() {
  const [rows] = await pool.query(`
    SELECT s.id, s.nis, s.nisn, s.full_name, s.class_id, s.gender, s.birth_date, s.address, s.parent_phone, s.is_active, c.name as class_name
    FROM student_profiles s
    LEFT JOIN classes c ON s.class_id = c.id
    ORDER BY c.grade_level ASC, c.name ASC, s.full_name ASC
  `);
  return rows as any[];
}

export async function createStudent(nis: string, nisn: string | null, full_name: string, class_id: number, gender: string | null, birth_date: string | null, address: string | null, parent_phone: string | null) {
  const [res] = await pool.query(
    'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [nis, nisn, full_name, class_id, gender, birth_date || null, address || null, parent_phone || null]
  );
  return (res as any).insertId;
}

export async function updateStudent(id: number, nis: string, nisn: string | null, full_name: string, class_id: number, gender: string | null, birth_date: string | null, address: string | null, parent_phone: string | null) {
  await pool.query(
    'UPDATE student_profiles SET nis = ?, nisn = ?, full_name = ?, class_id = ?, gender = ?, birth_date = ?, address = ?, parent_phone = ? WHERE id = ?',
    [nis, nisn, full_name, class_id, gender, birth_date || null, address || null, parent_phone || null, id]
  );
  return true;
}

export async function deleteStudent(id: number) {
  await pool.query('DELETE FROM student_profiles WHERE id = ?', [id]);
  return true;
}

// --- Teacher Subjects mapping ---
export async function getTeacherSubjects() {
  const [rows] = await pool.query(`
    SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id, u.name as teacher_name, s.name as subject_name, s.code as subject_code, c.name as class_name
    FROM teacher_subjects ts
    JOIN users u ON ts.teacher_id = u.id
    JOIN subjects s ON ts.subject_id = s.id
    JOIN classes c ON ts.class_id = c.id
    ORDER BY u.name ASC, c.grade_level ASC, c.name ASC
  `);
  return rows as any[];
}

export async function getTeacherSubjectsByTeacher(teacherId: number) {
  const [rows] = await pool.query(`
    SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id, s.name as subject_name, s.code as subject_code, c.name as class_name, c.grade_level
    FROM teacher_subjects ts
    JOIN subjects s ON ts.subject_id = s.id
    JOIN classes c ON ts.class_id = c.id
    WHERE ts.teacher_id = ?
    ORDER BY c.grade_level ASC, c.name ASC
  `, [teacherId]);
  return rows as any[];
}

export async function createTeacherSubject(teacherId: number, subjectId: number, classId: number) {
  const [res] = await pool.query(
    'INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
    [teacherId, subjectId, classId]
  );
  return (res as any).insertId;
}

export async function deleteTeacherSubject(id: number) {
  await pool.query('DELETE FROM teacher_subjects WHERE id = ?', [id]);
  return true;
}
