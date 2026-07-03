import pool from '../db';

export interface StudentAttendanceRecordInput {
  studentId: number;
  status: 'present' | 'sick' | 'permission' | 'absent' | 'late';
  notes?: string;
  arrivalTime?: string;
}

export interface StaffAttendanceRecordInput {
  userId: number;
  status: 'present' | 'sick' | 'permission' | 'absent' | 'late';
  notes?: string;
}

// --- STUDENT ATTENDANCE ---

export async function recordStudentAttendance(
  classId: number,
  subjectId: number | null,
  teacherId: number,
  sessionDate: string,
  sessionType: 'daily' | 'subject',
  records: StudentAttendanceRecordInput[]
) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Check or create attendance session
    let sessionId: number;
    const [existingSess] = await conn.query(
      `SELECT id FROM attendance_sessions 
       WHERE class_id = ? AND COALESCE(subject_id, 0) = COALESCE(?, 0) AND session_date = ? AND session_type = ?`,
      [classId, subjectId, sessionDate, sessionType]
    );

    if ((existingSess as any[]).length > 0) {
      sessionId = (existingSess as any[])[0].id;
    } else {
      const [insertSess] = await conn.query(
        `INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, session_date, session_type)
         VALUES (?, ?, ?, ?, ?)`,
        [classId, subjectId, teacherId, sessionDate, sessionType]
      );
      sessionId = (insertSess as any).insertId;
    }

    // 2. Insert or update student records
    for (const rec of records) {
      await conn.query(
        `INSERT INTO attendance_records (session_id, student_id, user_id, status, arrival_time, notes, recorded_by)
         VALUES (?, ?, NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           arrival_time = VALUES(arrival_time),
           notes = VALUES(notes),
           recorded_by = VALUES(recorded_by)`,
        [sessionId, rec.studentId, rec.status, rec.arrivalTime || null, rec.notes || null, teacherId]
      );
    }

    await conn.commit();
    return sessionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getStudentAttendanceForSession(classId: number, sessionDate: string, sessionType: 'daily' | 'subject', subjectId: number | null) {
  const [session] = await pool.query(
    `SELECT id FROM attendance_sessions 
     WHERE class_id = ? AND COALESCE(subject_id, 0) = COALESCE(?, 0) AND session_date = ? AND session_type = ?`,
    [classId, subjectId, sessionDate, sessionType]
  );

  const sessionId = (session as any[]).length > 0 ? (session as any[])[0].id : null;

  const [records] = await pool.query(
    `SELECT 
       sp.id as student_id,
       sp.full_name as student_name,
       sp.nis,
       ar.id as record_id,
       COALESCE(ar.status, 'present') as status,
       ar.arrival_time,
       ar.notes
     FROM student_profiles sp
     LEFT JOIN attendance_records ar ON sp.id = ar.student_id AND ar.session_id = ?
     WHERE sp.class_id = ?
     ORDER BY sp.full_name ASC`,
    [sessionId, classId]
  );

  return { sessionId, records: records as any[] };
}

// --- STAFF ATTENDANCE ---

export async function recordStaffAttendance(
  recordedByAdminId: number,
  sessionDate: string,
  records: StaffAttendanceRecordInput[]
) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Check or create staff attendance session (class_id is null)
    let sessionId: number;
    const [existingSess] = await conn.query(
      `SELECT id FROM attendance_sessions 
       WHERE class_id IS NULL AND session_date = ? AND session_type = 'staff'`,
      [sessionDate]
    );

    if ((existingSess as any[]).length > 0) {
      sessionId = (existingSess as any[])[0].id;
    } else {
      const [insertSess] = await conn.query(
        `INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, session_date, session_type)
         VALUES (NULL, NULL, ?, ?, 'staff')`,
        [recordedByAdminId, sessionDate]
      );
      sessionId = (insertSess as any).insertId;
    }

    // 2. Insert or update staff records
    for (const rec of records) {
      await conn.query(
        `INSERT INTO attendance_records (session_id, student_id, user_id, status, notes, recorded_by)
         VALUES (?, NULL, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status = VALUES(status),
           notes = VALUES(notes),
           recorded_by = VALUES(recorded_by)`,
        [sessionId, rec.userId, rec.status, rec.notes || null, recordedByAdminId]
      );
    }

    await conn.commit();
    return sessionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getStaffAttendanceForDate(sessionDate: string) {
  const [session] = await pool.query(
    `SELECT id FROM attendance_sessions 
     WHERE class_id IS NULL AND session_date = ? AND session_type = 'staff'`,
    [sessionDate]
  );

  const sessionId = (session as any[]).length > 0 ? (session as any[])[0].id : null;

  // We select all teachers and coaches from users table
  const [records] = await pool.query(
    `SELECT 
       u.id as user_id,
       u.name,
       u.email,
       r.name as role_name,
       ar.id as record_id,
       COALESCE(ar.status, 'present') as status,
       ar.notes
     FROM users u
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ar.session_id = ?
     WHERE r.name IN ('teacher', 'coach')
     ORDER BY r.name ASC, u.name ASC`,
    [sessionId]
  );

  return { sessionId, records: records as any[] };
}

export async function getStaffAttendanceHistory(
  startDate: string,
  endDate: string,
  userIdFilter?: number | null,
  roleFilter?: string | null
) {
  const params: any[] = [startDate, endDate];
  const conditions: string[] = [];

  if (userIdFilter) {
    conditions.push('AND u.id = ?');
    params.push(userIdFilter);
  }
  if (roleFilter && (roleFilter === 'teacher' || roleFilter === 'coach')) {
    conditions.push('AND r.name = ?');
    params.push(roleFilter);
  }

  const [rows] = await pool.query(
    `SELECT
       asess.session_date,
       u.id as user_id,
       u.name as user_name,
       r.name as role_name,
       ar.status,
       ar.notes
     FROM attendance_sessions asess
     JOIN attendance_records ar ON ar.session_id = asess.id
     JOIN users u ON ar.user_id = u.id
     JOIN user_roles ur ON u.id = ur.user_id
     JOIN roles r ON ur.role_id = r.id
     WHERE asess.session_type = 'staff'
       AND asess.class_id IS NULL
       AND asess.session_date BETWEEN ? AND ?
       ${conditions.join(' ')}
     ORDER BY asess.session_date DESC, r.name ASC, u.name ASC`,
    params
  );
  return rows as any[];
}

export async function getStaffSelfAttendanceHistory(userId: number) {
  const [rows] = await pool.query(
    `SELECT 
       asess.session_date,
       ar.status,
       ar.notes
     FROM attendance_records ar
     JOIN attendance_sessions asess ON ar.session_id = asess.id
     WHERE ar.user_id = ? AND asess.session_type = 'staff'
     ORDER BY asess.session_date DESC`,
    [userId]
  );
  return rows as any[];
}

// --- STUDENT ATTENDANCE HISTORIES ---

export async function getStudentAttendanceHistory(studentId: number) {
  const [rows] = await pool.query(
    `SELECT 
       asess.session_date,
       asess.session_type,
       subj.name as subject_name,
       ar.status,
       ar.arrival_time,
       ar.notes,
       u.name as recorded_by_name
     FROM attendance_records ar
     JOIN attendance_sessions asess ON ar.session_id = asess.id
     LEFT JOIN subjects subj ON asess.subject_id = subj.id
     LEFT JOIN users u ON ar.recorded_by = u.id
     WHERE ar.student_id = ?
     ORDER BY asess.session_date DESC, asess.session_type ASC`,
    [studentId]
  );
  return rows as any[];
}

export async function getStudentAttendanceSummary(studentId: number) {
  const [rows] = await pool.query(
    `SELECT 
       status,
       COUNT(*) as count
     FROM attendance_records
     WHERE student_id = ?
     GROUP BY status`,
    [studentId]
  );

  const summary = { present: 0, sick: 0, permission: 0, absent: 0, late: 0 };
  for (const row of rows as any[]) {
    if (row.status in summary) {
      summary[row.status as keyof typeof summary] = row.count;
    }
  }
  return summary;
}
