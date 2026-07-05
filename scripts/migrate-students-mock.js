const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting student mockup migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    const today = new Date().toISOString().split('T')[0];

    // Get active academic period or select the first one
    const [periods] = await connection.query('SELECT id FROM academic_periods WHERE is_active = TRUE LIMIT 1');
    const periodId = periods.length > 0 ? periods[0].id : null;
    if (!periodId) {
      throw new Error('No active academic period found. Run setup-db first.');
    }

    // Get or create classes
    const getOrCreateClass = async (name, grade) => {
      const [rows] = await connection.query('SELECT id FROM classes WHERE name = ? LIMIT 1', [name]);
      if (rows.length > 0) return rows[0].id;
      const [res] = await connection.query('INSERT INTO classes (name, grade_level) VALUES (?, ?)', [name, grade]);
      return res.insertId;
    };

    const class4A = await getOrCreateClass('4A', 4);
    const class4B = await getOrCreateClass('4B', 4);
    const class4C = await getOrCreateClass('4C', 4);
    const class1A = await getOrCreateClass('1A', 1);
    const class1B = await getOrCreateClass('1B', 1);

    // Find any teacher to assign grades
    const [teachers] = await connection.query(
      `SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'teacher' LIMIT 1`
    );
    const teacherId = teachers.length > 0 ? teachers[0].id : null;

    // Find a core subject to link grades (e.g. Matematika MTK)
    const [subjects] = await connection.query("SELECT id FROM subjects WHERE code = 'MTK' LIMIT 1");
    const subjectId = subjects.length > 0 ? subjects[0].id : null;

    console.log(`Using teacherId: ${teacherId}, subjectId: ${subjectId}, periodId: ${periodId}`);

    // Upsert students
    const upsertStudent = async (nis, nisn, full_name, class_id, gender) => {
      // Check if NIS or full name exists
      const [rows] = await connection.query('SELECT id FROM student_profiles WHERE nis = ? OR full_name = ? LIMIT 1', [nis, full_name]);
      if (rows.length > 0) {
        const id = rows[0].id;
        await connection.query(
          'UPDATE student_profiles SET nis = ?, nisn = ?, full_name = ?, class_id = ?, gender = ? WHERE id = ?',
          [nis, nisn, full_name, class_id, gender, id]
        );
        return id;
      } else {
        const [res] = await connection.query(
          'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender) VALUES (?, ?, ?, ?, ?)',
          [nis, nisn, full_name, class_id, gender]
        );
        return res.insertId;
      }
    };

    const sAditya = await upsertStudent('1003', '0012345678', 'Aditya Nugraha', class4A, 'male');
    const sBudi = await upsertStudent('1001', '0012345679', 'Budi Santoso', class4A, 'male');
    const sCitra = await upsertStudent('1004', '0012345680', 'Citra Lestari', class4B, 'female');
    const sDeni = await upsertStudent('1005', '0012345681', 'Deni Pratama', class4C, 'male');

    console.log('✅ Students upserted.');

    // Seed grades to achieve precise averages
    // Aditya Nugraha: 88.5
    // Budi Santoso: 72.0
    // Citra Lestari: 92.4
    // Deni Pratama: 81.8
    const setGrades = async (studentId, scores) => {
      // Clear existing grades for this student first to ensure average is exact
      await connection.query('DELETE FROM grades WHERE student_id = ?', [studentId]);
      
      const types = ['assignment', 'midterm', 'final'];
      for (let i = 0; i < scores.length; i++) {
        await connection.query(
          'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score) VALUES (?, ?, ?, ?, ?, ?)',
          [studentId, subjectId, periodId, teacherId, types[i], scores[i]]
        );
      }
    };

    await setGrades(sAditya, [88.0, 89.0, 88.5]);
    await setGrades(sBudi, [70.0, 74.0, 72.0]);
    await setGrades(sCitra, [92.0, 93.0, 92.2]);
    await setGrades(sDeni, [81.0, 82.0, 82.4]);

    console.log('✅ Student grades updated.');

    // Seed daily attendance for today
    // Check or create attendance session for class4A, class4B, class4C for today
    const getOrCreateSession = async (classId) => {
      const [sess] = await connection.query(
        `SELECT id FROM attendance_sessions WHERE class_id = ? AND session_date = ? AND session_type = 'daily' LIMIT 1`,
        [classId, today]
      );
      if (sess.length > 0) return sess[0].id;
      const [res] = await connection.query(
        `INSERT INTO attendance_sessions (class_id, teacher_id, session_date, session_type) VALUES (?, ?, ?, 'daily')`,
        [classId, teacherId, today]
      );
      return res.insertId;
    };

    const sess4A = await getOrCreateSession(class4A);
    const sess4B = await getOrCreateSession(class4B);
    const sess4C = await getOrCreateSession(class4C);

    const setAttendance = async (sessionId, studentId, status) => {
      await connection.query(
        `INSERT INTO attendance_records (session_id, student_id, status, recorded_by) 
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [sessionId, studentId, status, teacherId]
      );
    };

    await setAttendance(sess4A, sAditya, 'present'); // Hadir
    await setAttendance(sess4A, sBudi, 'permission'); // Izin
    await setAttendance(sess4B, sCitra, 'sick'); // Sakit
    await setAttendance(sess4C, sDeni, 'present'); // Hadir

    console.log('✅ Daily attendance for today seeded.');

    // Add activity logs matching this
    await connection.query(`
      INSERT INTO activity_logs (user_id, user_name, activity, category) VALUES
      (?, 'Admin Utama', 'Sinkronisasi profil akademik siswa kelas 4', 'Data Siswa'),
      (?, 'Sri Wahyuni, S.Pd.', 'Melakukan absensi harian kelas 4A', 'Absensi'),
      (?, 'Sri Wahyuni, S.Pd.', 'Melakukan absensi harian kelas 4B', 'Absensi'),
      (?, 'Sri Wahyuni, S.Pd.', 'Melakukan absensi harian kelas 4C', 'Absensi')
    `, [teacherId, teacherId, teacherId, teacherId]);

    console.log('✅ Mockup seeding completed successfully!');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Mockup seeding failed:', err);
  process.exit(1);
});
