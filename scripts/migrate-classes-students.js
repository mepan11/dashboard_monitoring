const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting classes & students seeding and migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // 1. Make class_id nullable in student_profiles
    console.log('Altering student_profiles to make class_id nullable...');
    await connection.query('ALTER TABLE student_profiles MODIFY class_id INT(11) NULL');

    // 2. Clear old data from student-dependent tables to start fresh
    console.log('Clearing old student and grade records...');
    await connection.query('DELETE FROM grades');
    await connection.query('DELETE FROM attendance_records');
    await connection.query('DELETE FROM ekskul_members');
    await connection.query('DELETE FROM parent_profiles');
    await connection.query('DELETE FROM student_profiles');

    // 3. Ensure all 12 classes exist and delete any invalid ones
    console.log('Ensuring exactly 12 standard classes (1A to 6B) exist...');
    
    // Clear old classes schedules and assignments referencing invalid classes
    await connection.query('DELETE FROM class_schedules');
    await connection.query('DELETE FROM teacher_subjects');
    await connection.query('DELETE FROM classes');

    const classNames = [
      { name: '1A', grade: 1 }, { name: '1B', grade: 1 },
      { name: '2A', grade: 2 }, { name: '2B', grade: 2 },
      { name: '3A', grade: 3 }, { name: '3B', grade: 3 },
      { name: '4A', grade: 4 }, { name: '4B', grade: 4 },
      { name: '5A', grade: 5 }, { name: '5B', grade: 5 },
      { name: '6A', grade: 6 }, { name: '6B', grade: 6 }
    ];

    const classIdMap = {};
    for (const c of classNames) {
      const [res] = await connection.query(
        'INSERT INTO classes (name, grade_level, homeroom_teacher_id, is_active) VALUES (?, ?, NULL, 1)',
        [c.name, c.grade]
      );
      classIdMap[c.name] = res.insertId;
    }

    // 4. Create the 12 Homeroom Teachers (Wali Kelas)
    console.log('Creating 12 homeroom teachers...');
    const teachers = [
      { name: 'Ibu Anita Sari', email: 'anita@example.com', className: '1A' },
      { name: 'Bpk. Ahmad Fauzi', email: 'ahmad@example.com', className: '1B' },
      { name: 'Ibu Siti Aminah', email: 'siti.aminah@example.com', className: '2A' },
      { name: 'Ibu Dini Aminarti', email: 'dini@example.com', className: '2B' },
      { name: 'Bpk. Eko Prasetyo', email: 'eko@example.com', className: '3A' },
      { name: 'Ibu Farida Utami', email: 'farida@example.com', className: '3B' },
      { name: 'Bpk. Gilang Ramadhan', email: 'gilang@example.com', className: '4A' },
      { name: 'Ibu Hana Pertiwi', email: 'hana@example.com', className: '4B' },
      { name: 'Bpk. Indra Wijaya', email: 'indra@example.com', className: '5A' },
      { name: 'Ibu Julia Kurnia', email: 'julia@example.com', className: '5B' },
      { name: 'Bpk. Lukman Hakim', email: 'lukman@example.com', className: '6A' },
      { name: 'Ibu Mega Silviana', email: 'mega@example.com', className: '6B' }
    ];

    const dummyHash = '$2b$10$wR3G9B1f3r3h8yJ3z5w6e.G0r8N2V5o8l9d2C1Y7u5f3c2b8a4k6e'; // bcrypt hash for 'password'

    for (const t of teachers) {
      // Check if user already exists
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [t.email]);
      let teacherId;
      if (existing.length > 0) {
        teacherId = existing[0].id;
        await connection.query('UPDATE users SET name = ? WHERE id = ?', [t.name, teacherId]);
      } else {
        const [userRes] = await connection.query(
          'INSERT INTO users (name, email, password_hash, is_active) VALUES (?, ?, ?, 1)',
          [t.name, t.email, dummyHash]
        );
        teacherId = userRes.insertId;

        // Assign teacher role (role_id = 3)
        await connection.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, 3) ON DUPLICATE KEY UPDATE role_id = 3',
          [teacherId]
        );
      }

      // Map teacher to class homeroom_teacher_id
      const classId = classIdMap[t.className];
      if (classId) {
        await connection.query(
          'UPDATE classes SET homeroom_teacher_id = ? WHERE id = ?',
          [teacherId, classId]
        );
      }
    }

    // 5. Seed exactly 28 students per class (making a total of 336 students)
    console.log('Seeding 28 students per class (Total: 336 students)...');
    const firstNames = [
      'Adi', 'Budi', 'Citra', 'Deni', 'Eka', 'Fajar', 'Gita', 'Hadi', 'Indah', 'Joko',
      'Kartika', 'Lestari', 'Mulyono', 'Novi', 'Oktavian', 'Putri', 'Rian', 'Siti', 'Taufik', 'Utami',
      'Wawan', 'Yanti', 'Zaki', 'Amalia', 'Bagus', 'Dewi', 'Farhan', 'Hana', 'Irfan', 'Lia'
    ];
    const lastNames = [
      'Pratama', 'Santoso', 'Wijaya', 'Lestari', 'Nugraha', 'Putra', 'Hidayat', 'Kurniawan', 'Saputra', 'Sari',
      'Utama', 'Rahmawati', 'Ramadhan', 'Gunawan', 'Setiawan', 'Wahyuni', 'Susanto', 'Hartono', 'Purnama', 'Kusuma'
    ];

    let studentIndex = 1;
    for (const [className, classId] of Object.entries(classIdMap)) {
      for (let s = 1; s <= 28; s++) {
        const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const fullName = `${fName} ${lName}`;
        
        const nis = `24${String(className).toLowerCase()}${String(s).padStart(2, '0')}`;
        const nisn = `0145${String(studentIndex).padStart(6, '0')}`;
        const gender = Math.random() > 0.5 ? 'male' : 'female';
        
        const birthDate = `201${12 - parseInt(className[0], 10)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        const address = `Jl. Merdeka No. ${studentIndex}, Jakarta`;
        const phone = `08123456${String(studentIndex).padStart(4, '0')}`;

        const [studRes] = await connection.query(`
          INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address, parent_phone, is_active) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [nis, nisn, fullName, classId, gender, birthDate, address, phone]);
        
        const studentId = studRes.insertId;

        // Seed some random grades for this student (UTS, UAS) for Period 3 & 4
        // Subject Math = 1, Indo = 2, IPA = 3
        const subjectIds = [1, 2, 3];
        const periodIds = [3, 4];
        const teacherId = 3; // Sri Wahyuni

        for (const subId of subjectIds) {
          for (const perId of periodIds) {
            const utsScore = Math.floor(Math.random() * 30) + 70; // 70 to 100
            const uasScore = Math.floor(Math.random() * 30) + 70;

            await connection.query(`
              INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, grade_letter, notes) 
              VALUES (?, ?, ?, ?, 'midterm', ?, 'A', 'Bagus')
            `, [studentId, subId, perId, teacherId, utsScore]);

            await connection.query(`
              INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, grade_letter, notes) 
              VALUES (?, ?, ?, ?, 'final', ?, 'A', 'Sangat Bagus')
            `, [studentId, subId, perId, teacherId, uasScore]);
          }
        }

        studentIndex++;
      }
    }

    console.log(`✅ Success! Seeded exactly 12 classes, 12 homeroom teachers, and ${studentIndex - 1} students with grades.`);
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
