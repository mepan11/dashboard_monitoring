const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting subjects database migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // Add weekly_hours column
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM subjects LIKE 'weekly_hours'
    `);
    
    if (columns.length === 0) {
      console.log('Adding column weekly_hours...');
      await connection.query('ALTER TABLE subjects ADD COLUMN weekly_hours INT DEFAULT 4');
    } else {
      console.log('Column weekly_hours already exists.');
    }

    // Delete extracurriculars from subjects table
    console.log('Cleaning up extracurricular entries from subjects table...');
    await connection.query("DELETE FROM subjects WHERE code IN ('PRAMUKA', 'FUTSAL')");
    await connection.query("DELETE FROM subjects WHERE category = 'ArtSport' OR name LIKE '%Ekstrakurikuler%'");

    // Seed / update academic subjects
    const upsertSubject = async (code, name, category, grade_level, is_core, weekly_hours) => {
      const [rows] = await connection.query('SELECT id FROM subjects WHERE code = ? LIMIT 1', [code]);
      if (rows.length > 0) {
        const id = rows[0].id;
        await connection.query(`
          UPDATE subjects 
          SET name = ?, category = ?, grade_level = ?, is_core = ?, weekly_hours = ? 
          WHERE id = ?
        `, [name, category, grade_level, is_core, weekly_hours, id]);
        return id;
      } else {
        const [res] = await connection.query(`
          INSERT INTO subjects (code, name, category, grade_level, is_core, weekly_hours) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [code, name, category, grade_level, is_core, weekly_hours]);
        return res.insertId;
      }
    };

    console.log('Seeding academic subjects...');
    const mtkId = await upsertSubject('MTK', 'Matematika', 'Academic', '1,2,3,4,5,6', 1, 6);
    const bindoId = await upsertSubject('BINDO', 'Bahasa Indonesia', 'Academic', '1,2,3,4,5,6', 1, 8);
    const ipaId = await upsertSubject('IPA', 'Ilmu Pengetahuan Alam', 'Academic', '4,5,6', 1, 5);
    const binggrisId = await upsertSubject('BINGGRIS', 'Bahasa Inggris', 'Academic', '3,4,5,6', 1, 4);
    const pknId = await upsertSubject('PKN', 'Pendidikan Kewarganegaraan', 'Academic', '1,2,3,4,5,6', 1, 3);
    const sbdpId = await upsertSubject('SBDP', 'Seni Budaya & Prakarya', 'Academic', '1,2,3,4,5,6', 1, 3);
    const pjokId = await upsertSubject('PJOK', 'Pendidikan Jasmani, Olahraga, & Kesehatan', 'Academic', '1,2,3,4,5,6', 1, 3);

    console.log('Seeding teacher class assignments...');
    
    // Clear old teacher subject mappings for academic subjects to seed cleanly
    await connection.query('DELETE FROM teacher_subjects');

    const addAssignment = async (teacherId, subjectId, classId) => {
      await connection.query(`
        INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) 
        VALUES (?, ?, ?)
      `, [teacherId, subjectId, classId]);
    };

    // Sri Wahyuni (3), Subandi (4), Ujang Jabbar (9), mePannn (10)
    // 1A (1), 4A (2), 1B (3), 4B (9), 6A (12), 6B (13)
    await addAssignment(4, mtkId, 2);      // MTK in 4A -> Subandi
    await addAssignment(3, mtkId, 9);      // MTK in 4B -> Sri Wahyuni
    
    await addAssignment(3, bindoId, 2);    // BINDO in 4A -> Sri Wahyuni
    await addAssignment(9, bindoId, 1);    // BINDO in 1A -> Ujang Jabbar
    
    await addAssignment(4, ipaId, 2);      // IPA in 4A -> Subandi
    await addAssignment(4, ipaId, 12);     // IPA in 6A -> Subandi

    await addAssignment(10, binggrisId, 2); // BINGGRIS in 4A -> mePannn
    await addAssignment(10, binggrisId, 9); // BINGGRIS in 4B -> mePannn

    await addAssignment(9, pknId, 1);       // PKN in 1A -> Ujang Jabbar
    await addAssignment(3, sbdpId, 2);      // SBDP in 4A -> Sri Wahyuni
    await addAssignment(9, pjokId, 2);      // PJOK in 4A -> Ujang Jabbar

    console.log('✅ Seeding completed.');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
