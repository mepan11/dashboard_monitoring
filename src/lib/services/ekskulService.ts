import pool from '../db';

export interface EkskulAttendanceInput {
  studentId: number;
  status: 'present' | 'absent' | 'excused';
  notes?: string;
}

// --- EKSKUL LOGS ---
export async function getEkskulLogs(ekskulId: number) {
  const [rows] = await pool.query(
    'SELECT * FROM ekskul_logs WHERE extracurricular_id = ? ORDER BY activity_date DESC',
    [ekskulId]
  );
  return rows as any[];
}

export async function createEkskulLog(ekskulId: number, activityDate: string, activityName: string, description: string | null) {
  const [res] = await pool.query(
    'INSERT INTO ekskul_logs (extracurricular_id, activity_date, activity_name, description) VALUES (?, ?, ?, ?)',
    [ekskulId, activityDate, activityName, description]
  );
  return (res as any).insertId;
}

// --- EKSKUL COACH FINDER ---
export async function getEkskulsByCoach(coachUserId: number) {
  const [rows] = await pool.query(
    'SELECT * FROM extracurriculars WHERE coach_id = ? AND is_active = TRUE',
    [coachUserId]
  );
  return rows as any[];
}

// --- EKSKUL ATTENDANCE ---
export async function getEkskulAttendance(ekskulId: number, sessionDate: string) {
  // Let the coach mark attendance for any student. We do a left join from student_profiles.
  const [rows] = await pool.query(
    `SELECT 
       sp.id as student_id,
       sp.full_name as student_name,
       sp.nis,
       c.name as class_name,
       ea.id as record_id,
       COALESCE(ea.status, 'present') as status,
       ea.notes
     FROM student_profiles sp
     JOIN classes c ON sp.class_id = c.id
     LEFT JOIN ekskul_attendances ea ON sp.id = ea.student_id AND ea.extracurricular_id = ? AND ea.session_date = ?
     WHERE sp.is_active = TRUE
     ORDER BY sp.full_name ASC`,
    [ekskulId, sessionDate]
  );
  return rows as any[];
}

export async function recordEkskulAttendance(
  ekskulId: number,
  sessionDate: string,
  records: EkskulAttendanceInput[],
  recordedByUserId: number
) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    for (const rec of records) {
      await conn.query(
        `INSERT INTO ekskul_attendances (extracurricular_id, student_id, session_date, status, notes, recorded_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           notes = VALUES(notes),
           recorded_by = VALUES(recorded_by)`,
        [ekskulId, rec.studentId, sessionDate, rec.status, rec.notes || null, recordedByUserId]
      );
    }
    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getStudentEkskulAttendanceHistory(studentId: number) {
  const [rows] = await pool.query(
    `SELECT 
       ea.session_date,
       ea.status,
       ea.notes,
       e.name as extracurricular_name,
       u.name as coach_name
     FROM ekskul_attendances ea
     JOIN extracurriculars e ON ea.extracurricular_id = e.id
     JOIN users u ON e.coach_id = u.id
     WHERE ea.student_id = ?
     ORDER BY ea.session_date DESC`,
    [studentId]
  );
  return rows as any[];
}

// --- LESSON LOGS FOR TEACHER ---
export async function getLessonLogsByTeacher(teacherId: number) {
  const [rows] = await pool.query(
    `SELECT 
       ll.id,
       ll.topic,
       ll.start_time,
       ll.end_time,
       ll.duration_minutes,
       ll.summary,
       ll.created_at,
       s.name as subject_name,
       c.name as class_name,
       u.name as teacher_name
     FROM lesson_logs ll
     JOIN subjects s ON ll.subject_id = s.id
     JOIN classes c ON ll.class_id = c.id
     JOIN users u ON ll.teacher_id = u.id
     WHERE ll.teacher_id = ?
     ORDER BY ll.created_at DESC`,
    [teacherId]
  );
  return rows as any[];
}

export async function getAllLessonLogs() {
  const [rows] = await pool.query(
    `SELECT 
       ll.id,
       ll.topic,
       ll.start_time,
       ll.end_time,
       ll.duration_minutes,
       ll.summary,
       ll.created_at,
       s.name as subject_name,
       c.name as class_name,
       u.name as teacher_name
     FROM lesson_logs ll
     JOIN subjects s ON ll.subject_id = s.id
     JOIN classes c ON ll.class_id = c.id
     JOIN users u ON ll.teacher_id = u.id
     ORDER BY ll.created_at DESC`
  );
  return rows as any[];
}

export async function createLessonLog(
  teacherId: number,
  subjectId: number,
  classId: number,
  topic: string,
  startTime: string,
  endTime: string,
  durationMinutes: number,
  summary: string
) {
  const [res] = await pool.query(
    `INSERT INTO lesson_logs (teacher_id, subject_id, class_id, topic, start_time, end_time, duration_minutes, summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [teacherId, subjectId, classId, topic, startTime, endTime, durationMinutes, summary]
  );
  return (res as any).insertId;
}
