import pool from '../db';

export interface GradeInput {
  student_id: number;
  subject_id: number;
  period_id: number;
  teacher_id: number;
  type: 'assignment' | 'midterm' | 'final';
  score: number;
  notes?: string;
}

export async function inputGrade(input: GradeInput) {
  // We determine grade letter based on score
  let gradeLetter = 'E';
  const score = input.score;
  if (score >= 85) gradeLetter = 'A';
  else if (score >= 75) gradeLetter = 'B';
  else if (score >= 60) gradeLetter = 'C';
  else if (score >= 45) gradeLetter = 'D';

  const [res] = await pool.query(`
    INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, grade_letter, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      score = VALUES(score),
      grade_letter = VALUES(grade_letter),
      teacher_id = VALUES(teacher_id),
      notes = VALUES(notes)
  `, [
    input.student_id,
    input.subject_id,
    input.period_id,
    input.teacher_id,
    input.type,
    input.score,
    gradeLetter,
    input.notes || null
  ]);

  return res;
}

export async function getGradesForClassAndSubject(classId: number, subjectId: number, periodId: number) {
  // Get all students in the class, and outer join their grades for this subject and period
  const [rows] = await pool.query(`
    SELECT 
      s.id as student_id,
      s.full_name as student_name,
      s.nis,
      g_assign.score as assignment_score, g_assign.notes as assignment_notes,
      g_mid.score as midterm_score, g_mid.notes as midterm_notes,
      g_final.score as final_score, g_final.notes as final_notes
    FROM student_profiles s
    LEFT JOIN grades g_assign ON s.id = g_assign.student_id AND g_assign.subject_id = ? AND g_assign.period_id = ? AND g_assign.type = 'assignment'
    LEFT JOIN grades g_mid ON s.id = g_mid.student_id AND g_mid.subject_id = ? AND g_mid.period_id = ? AND g_mid.type = 'midterm'
    LEFT JOIN grades g_final ON s.id = g_final.student_id AND g_final.subject_id = ? AND g_final.period_id = ? AND g_final.type = 'final'
    WHERE s.class_id = ?
    ORDER BY s.full_name ASC
  `, [subjectId, periodId, subjectId, periodId, subjectId, periodId, classId]);

  return rows as any[];
}

export async function getStudentReportCard(studentId: number, periodId: number) {
  // Returns academic grades pivoted per subject
  const [rows] = await pool.query(`
    SELECT 
      s.id as subject_id,
      s.code as subject_code,
      s.name as subject_name,
      s.category,
      s.is_core,
      COALESCE(g_assign.score, 0) as assignment_score,
      COALESCE(g_mid.score, 0) as midterm_score,
      COALESCE(g_final.score, 0) as final_score,
      -- Calculate final weighted score: Assignment 30%, Midterm 30%, Final 40%
      ROUND(
        (COALESCE(g_assign.score, 0) * 0.3) + 
        (COALESCE(g_mid.score, 0) * 0.3) + 
        (COALESCE(g_final.score, 0) * 0.4), 
        2
      ) as final_score_calc,
      u.name as teacher_name
    FROM subjects s
    LEFT JOIN grades g_assign ON s.id = g_assign.subject_id AND g_assign.student_id = ? AND g_assign.period_id = ? AND g_assign.type = 'assignment'
    LEFT JOIN grades g_mid ON s.id = g_mid.subject_id AND g_mid.student_id = ? AND g_mid.period_id = ? AND g_mid.type = 'midterm'
    LEFT JOIN grades g_final ON s.id = g_final.subject_id AND g_final.student_id = ? AND g_final.period_id = ? AND g_final.type = 'final'
    LEFT JOIN users u ON COALESCE(g_final.teacher_id, g_mid.teacher_id, g_assign.teacher_id) = u.id
    WHERE s.is_active = TRUE
    ORDER BY s.is_core DESC, s.name ASC
  `, [studentId, periodId, studentId, periodId, studentId, periodId]);

  return rows as any[];
}

export async function getClassReportCardSummaries(classId: number, periodId: number) {
  // Returns high-level averages of all students in a class
  const [rows] = await pool.query(`
    SELECT 
      sp.id as student_id,
      sp.full_name as student_name,
      sp.nis,
      COUNT(g.id) as graded_subjects_count,
      ROUND(AVG(g.score), 2) as average_score
    FROM student_profiles sp
    LEFT JOIN grades g ON sp.id = g.student_id AND g.period_id = ?
    WHERE sp.class_id = ?
    GROUP BY sp.id
    ORDER BY average_score DESC, sp.full_name ASC
  `, [periodId, classId]);

  return rows as any[];
}
