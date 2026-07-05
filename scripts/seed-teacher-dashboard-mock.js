const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting teacher dashboard mockup seeder...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // 1. Rename teacher ID 3 (Sri Wahyuni) to "Ibu Sarah Wijaya"
    console.log('Renaming teacher ID 3 to Ibu Sarah Wijaya...');
    await connection.query(
      "UPDATE users SET name = 'Ibu Sarah Wijaya' WHERE id = 3"
    );

    // 2. Ensure class 4C exists
    console.log('Ensuring Class 4-C exists...');
    const [c4c] = await connection.query("SELECT id FROM classes WHERE name = '4C'");
    let class4cId;
    if (c4c.length > 0) {
      class4cId = c4c[0].id;
      await connection.query(
        "UPDATE classes SET grade_level = 4, homeroom_teacher_id = 3 WHERE id = ?",
        [class4cId]
      );
    } else {
      const [res] = await connection.query(
        "INSERT INTO classes (name, grade_level, homeroom_teacher_id, is_active) VALUES ('4C', 4, 3, 1)"
      );
      class4cId = res.insertId;
    }

    // 3. Ensure Class 5-A exists
    console.log('Ensuring Class 5-A exists...');
    const [c5a] = await connection.query("SELECT id FROM classes WHERE name = '5A'");
    let class5aId;
    if (c5a.length > 0) {
      class5aId = c5a[0].id;
    } else {
      const [res] = await connection.query(
        "INSERT INTO classes (name, grade_level, homeroom_teacher_id, is_active) VALUES ('5A', 5, 20, 1)"
      );
      class5aId = res.insertId;
    }

    // 4. Ensure Class 3-B exists
    console.log('Ensuring Class 3-B exists...');
    const [c3b] = await connection.query("SELECT id FROM classes WHERE name = '3B'");
    let class3bId;
    if (c3b.length > 0) {
      class3bId = c3b[0].id;
    } else {
      const [res] = await connection.query(
        "INSERT INTO classes (name, grade_level, homeroom_teacher_id, is_active) VALUES ('3B', 3, 17, 1)"
      );
      class3bId = res.insertId;
    }

    // 5. Seed student profiles for 4C (Exactly 32 students)
    console.log('Seeding exactly 32 students for Class 4-C...');
    await connection.query("DELETE FROM student_profiles WHERE class_id = ?", [class4cId]);
    
    const mockupStudents = [
      { name: 'Aditya Arisandy', nis: '202400401', nisn: '0145200401', gender: 'male' },
      { name: 'Bella Nurhadi', nis: '202400402', nisn: '0145200402', gender: 'female' },
      { name: 'Cakra Wijaya', nis: '202400403', nisn: '0145200403', gender: 'male' },
      { name: 'Dina Rosalin', nis: '202400404', nisn: '0145200404', gender: 'female' },
      { name: 'Eko Saputra', nis: '202400405', nisn: '0145200405', gender: 'male' }
    ];

    for (const stud of mockupStudents) {
      await connection.query(`
        INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, is_active) 
        VALUES (?, ?, ?, ?, ?, 1)
      `, [stud.nis, stud.nisn, stud.name, class4cId, stud.gender]);
    }

    // Generate remaining 27 students
    const firstNames = ['Ferry', 'Gita', 'Hadi', 'Indah', 'Joko', 'Karin', 'Lia', 'Miko', 'Nia', 'Oscar', 'Putri', 'Rian', 'Siti', 'Taufik', 'Utami', 'Wawan', 'Yanti', 'Zaki', 'Amalia', 'Bagus', 'Dewi', 'Farhan', 'Hana', 'Irfan', 'Kartika', 'Lestari', 'Mulyono'];
    const lastNames = ['Kurniawan', 'Putra', 'Saputra', 'Sari', 'Setiawan', 'Susanto', 'Wahyuni', 'Wijaya', 'Nugraha', 'Pratama', 'Santoso', 'Hidayat', 'Ramadhan', 'Gunawan', 'Hartono', 'Purnama', 'Kusuma', 'Lestari', 'Utama', 'Rahmawati'];

    for (let i = 6; i <= 32; i++) {
      const fName = firstNames[(i - 6) % firstNames.length];
      const lName = lastNames[(i - 6) % lastNames.length];
      const fullName = `${fName} ${lName}`;
      const nis = `2024004${String(i).padStart(2, '0')}`;
      const nisn = `01452004${String(i).padStart(2, '0')}`;
      const gender = i % 2 === 0 ? 'female' : 'male';

      await connection.query(`
        INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, is_active) 
        VALUES (?, ?, ?, ?, ?, 1)
      `, [nis, nisn, fullName, class4cId, gender]);
    }

    // 6. Ensure Class 5-A has exactly 28 students
    console.log('Checking student count for Class 5-A...');
    const [c5aStudents] = await connection.query("SELECT COUNT(*) as count FROM student_profiles WHERE class_id = ?", [class5aId]);
    if (c5aStudents[0].count !== 28) {
      await connection.query("DELETE FROM student_profiles WHERE class_id = ?", [class5aId]);
      for (let i = 1; i <= 28; i++) {
        const name = `Siswa 5A No ${i}`;
        const nis = `2024050${String(i).padStart(2, '0')}`;
        const nisn = `01452050${String(i).padStart(2, '0')}`;
        await connection.query(`
          INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, is_active) 
          VALUES (?, ?, ?, ?, 'male', 1)
        `, [nis, nisn, name, class5aId]);
      }
    }

    // 7. Ensure Class 3-B has exactly 30 students
    console.log('Checking student count for Class 3-B...');
    const [c3bStudents] = await connection.query("SELECT COUNT(*) as count FROM student_profiles WHERE class_id = ?", [class3bId]);
    if (c3bStudents[0].count !== 30) {
      await connection.query("DELETE FROM student_profiles WHERE class_id = ?", [class3bId]);
      for (let i = 1; i <= 30; i++) {
        const name = `Siswa 3B No ${i}`;
        const nis = `2024030${String(i).padStart(2, '0')}`;
        const nisn = `01452030${String(i).padStart(2, '0')}`;
        await connection.query(`
          INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, is_active) 
          VALUES (?, ?, ?, ?, 'female', 1)
        `, [nis, nisn, name, class3bId]);
      }
    }

    // 8. Seed schedules for Class 4-C (homeroom class of Ibu Sarah Wijaya, ID 3)
    console.log('Seeding schedules for Class 4-C...');
    await connection.query("DELETE FROM class_schedules WHERE class_id = ?", [class4cId]);

    // Subject IDs: MTK = 1, BINDO = 2, IPA = 3, BINGGRIS = 6, PKN = 7, SBDP = 8, PJOK = 9
    const schedules4c = [
      // Monday
      { day: 'Senin', start: '07:30:00', end: '09:00:00', subId: 1, teacherId: 3 }, // Math
      { day: 'Senin', start: '09:15:00', end: '10:45:00', subId: 3, teacherId: 3 }, // Science
      // Tuesday
      { day: 'Selasa', start: '07:30:00', end: '09:00:00', subId: 6, teacherId: 12 }, // English
      { day: 'Selasa', start: '09:15:00', end: '10:45:00', subId: 2, teacherId: 13 }, // Indonesian
      // Wednesday
      { day: 'Rabu', start: '07:30:00', end: '09:00:00', subId: 7, teacherId: 14 }, // Social Studies (PKN)
      { day: 'Rabu', start: '09:15:00', end: '10:45:00', subId: 8, teacherId: 3 }, // Arts (SBDP) - Taught by Sarah Wijaya
      // Thursday
      { day: 'Kamis', start: '07:30:00', end: '09:00:00', subId: 1, teacherId: 3 }, // Math
      { day: 'Kamis', start: '09:15:00', end: '10:45:00', subId: 3, teacherId: 3 }, // Science
      // Friday
      { day: 'Jumat', start: '07:30:00', end: '09:00:00', subId: 2, teacherId: 15 }, // Religion
      { day: 'Jumat', start: '09:15:00', end: '10:15:00', subId: 9, teacherId: 16 }  // P.E.
    ];

    for (const sch of schedules4c) {
      await connection.query(`
        INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [class4cId, sch.day, sch.start, sch.end, sch.subId, sch.teacherId]);
    }

    // 9. Ensure Class 5-A has schedule taught by Ibu Sarah Wijaya (Science)
    console.log('Ensuring Class 5-A has Science schedule taught by Ibu Sarah Wijaya...');
    await connection.query(
      "DELETE FROM class_schedules WHERE class_id = ? AND subject_id = 3 AND teacher_id = 3",
      [class5aId]
    );
    await connection.query(`
      INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
      VALUES (?, 'Senin', '09:15:00', '10:45:00', 3, 3)
    `, [class5aId]);
    await connection.query(`
      INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
      VALUES (?, 'Kamis', '09:15:00', '10:45:00', 3, 3)
    `, [class5aId]);

    // 10. Ensure Class 3-B has schedule taught by Ibu Sarah Wijaya (Arts)
    console.log('Ensuring Class 3-B has Arts schedule taught by Ibu Sarah Wijaya...');
    await connection.query(
      "DELETE FROM class_schedules WHERE class_id = ? AND subject_id = 8 AND teacher_id = 3",
      [class3bId]
    );
    await connection.query(`
      INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
      VALUES (?, 'Rabu', '09:15:00', '10:45:00', 8, 3)
    `, [class3bId]);

    // ==========================================
    // 11. ALSO SEED SCHEDULES & WALI KELAS FOR SUBANDI (ID 4) TO PREVENT EMPTY TAB
    // ==========================================
    console.log('Setting Subandi (ID 4) as homeroom teacher of Class 4-A...');
    const [c4a] = await connection.query("SELECT id FROM classes WHERE name = '4A'");
    if (c4a.length > 0) {
      const class4aId = c4a[0].id;
      await connection.query(
        "UPDATE classes SET homeroom_teacher_id = 4 WHERE id = ?",
        [class4aId]
      );

      // Seed schedules for Subandi (ID 4) in Class 4-A, 5-B, and 3-A
      console.log('Seeding schedules for Subandi (ID 4) in Class 4-A...');
      await connection.query("DELETE FROM class_schedules WHERE class_id = ? AND teacher_id = 4", [class4aId]);
      await connection.query(`
        INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
        VALUES (?, 'Senin', '07:30:00', '09:00:00', 1, 4)
      `, [class4aId]); // Math
      await connection.query(`
        INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
        VALUES (?, 'Kamis', '07:30:00', '09:00:00', 1, 4)
      `, [class4aId]); // Math
      
      const [c5b] = await connection.query("SELECT id FROM classes WHERE name = '5B'");
      if (c5b.length > 0) {
        const class5bId = c5b[0].id;
        await connection.query("DELETE FROM class_schedules WHERE class_id = ? AND teacher_id = 4", [class5bId]);
        await connection.query(`
          INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
          VALUES (?, 'Senin', '09:15:00', '10:45:00', 3, 4)
        `, [class5bId]); // Science
      }

      const [c3a] = await connection.query("SELECT id FROM classes WHERE name = '3A'");
      if (c3a.length > 0) {
        const class3aId = c3a[0].id;
        await connection.query("DELETE FROM class_schedules WHERE class_id = ? AND teacher_id = 4", [class3aId]);
        await connection.query(`
          INSERT INTO class_schedules (class_id, day_name, start_time, end_time, subject_id, teacher_id) 
          VALUES (?, 'Rabu', '09:15:00', '10:45:00', 8, 4)
        `, [class3aId]); // Arts
      }
    }

    console.log('✅ Seeding completed! Teacher ID 3 is now Ibu Sarah Wijaya, homeroom of Class 4-C with 32 students. Teacher ID 4 is Subandi, homeroom of 4-A with schedules.');

  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Mockup seeding failed:', err);
  process.exit(1);
});
