const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting schedules database migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // Create class_schedules table
    console.log('Creating class_schedules table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS class_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        class_id INT NOT NULL,
        day_name VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        subject_id INT NOT NULL,
        teacher_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Clean up existing schedules to start fresh
    console.log('Clearing existing schedules...');
    await connection.query('DELETE FROM class_schedules');

    // Retrieve classes, subjects, and teachers
    const [classes] = await connection.query('SELECT id, name, grade_level FROM classes');
    const [subjects] = await connection.query('SELECT id, code, name FROM subjects');
    const [teachers] = await connection.query(`
      SELECT u.id, u.name 
      FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      JOIN roles r ON ur.role_id = r.id 
      WHERE r.name = 'teacher'
    `);

    if (classes.length === 0 || subjects.length === 0 || teachers.length === 0) {
      console.log('Missing database dependencies (classes, subjects, or teachers). Make sure they are seeded first.');
      return;
    }

    // Map subjects by code
    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s.code] = s.id;
    });

    // Fallback teacher
    const defaultTeacherId = teachers[0].id;

    // Helper to find a teacher assigned to class + subject, or fallback
    const findTeacher = async (classId, subjectId) => {
      const [rows] = await connection.query(`
        SELECT teacher_id FROM teacher_subjects 
        WHERE class_id = ? AND subject_id = ? 
        LIMIT 1
      `, [classId, subjectId]);
      if (rows.length > 0) {
        return rows[0].teacher_id;
      }
      return defaultTeacherId;
    };

    console.log('Seeding schedules for all classes...');

    for (const cls of classes) {
      // Define daily schedule templates
      const templates = [
        {
          day: 'Senin',
          slots: [
            { start: '07:30:00', end: '09:00:00', code: 'MTK' },
            { start: '09:15:00', end: '10:45:00', code: 'BINDO' }
          ]
        },
        {
          day: 'Selasa',
          slots: [
            { start: '07:30:00', end: '09:00:00', code: 'IPA' },
            { start: '09:15:00', end: '10:45:00', code: 'PKN' }
          ]
        },
        {
          day: 'Rabu',
          slots: [
            { start: '07:30:00', end: '09:00:00', code: 'BINGGRIS' },
            { start: '09:15:00', end: '10:45:00', code: 'SBDP' }
          ]
        },
        {
          day: 'Kamis',
          slots: [
            { start: '07:30:00', end: '09:00:00', code: 'PJOK' },
            { start: '09:15:00', end: '10:45:00', code: 'MTK' }
          ]
        },
        {
          day: 'Jumat',
          slots: [
            { start: '07:30:00', end: '09:00:00', code: 'BINDO' },
            { start: '09:15:00', end: '10:45:00', code: 'IPA' }
          ]
        }
      ];

      for (const t of templates) {
        for (const slot of t.slots) {
          const subjectId = subjectMap[slot.code];
          if (!subjectId) continue; // Skip if subject doesn't exist

          const teacherId = await findTeacher(cls.id, subjectId);

          await connection.query(`
            INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [cls.id, t.day, slot.start, slot.end, subjectId, teacherId]);
        }
      }
    }

    console.log('✅ Class schedules seeded successfully.');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
