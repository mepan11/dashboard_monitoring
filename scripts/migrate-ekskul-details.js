const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting extracurricular database migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // 1. Add extra columns to extracurriculars table
    console.log('Altering extracurriculars table...');
    
    const addColumn = async (colName, definition) => {
      // Check if column exists first
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM extracurriculars LIKE ?
      `, [colName]);
      
      if (columns.length === 0) {
        console.log(`Adding column ${colName}...`);
        await connection.query(`ALTER TABLE extracurriculars ADD COLUMN ${colName} ${definition}`);
      } else {
        console.log(`Column ${colName} already exists.`);
      }
    };

    await addColumn('schedule_day', 'VARCHAR(100) NULL');
    await addColumn('schedule_time', 'VARCHAR(100) NULL');
    await addColumn('venue', 'VARCHAR(100) NULL');
    await addColumn('uniform', 'VARCHAR(100) NULL');
    await addColumn('category', 'VARCHAR(100) NULL');
    await addColumn('target_age', 'VARCHAR(50) NULL');
    await addColumn('max_capacity', 'INT DEFAULT 20');
    await addColumn('is_open_reg', 'BOOLEAN DEFAULT TRUE');
    await addColumn('is_paid', 'BOOLEAN DEFAULT FALSE');
    await addColumn('competitions_won', 'INT DEFAULT 0');
    await addColumn('avg_progress', 'VARCHAR(50) DEFAULT "Level 1: Beginner"');
    await addColumn('status', 'VARCHAR(20) DEFAULT "active"');

    console.log('✅ Columns verified/added.');

    // 2. Create ekskul_members table
    console.log('Creating ekskul_members table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ekskul_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        extracurricular_id INT NOT NULL,
        student_id INT NOT NULL,
        progress_level VARCHAR(50) DEFAULT 'Level 1: Beginner',
        attendance_rate INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_member (extracurricular_id, student_id)
      )
    `);
    console.log('✅ ekskul_members table ready.');

    // 3. Setup mockup extracurriculars (Pramuka, Football, Traditional Dance, Robotik, Choir)
    console.log('Seeding extracurricular details...');
    
    // Find or create a coach
    const [coaches] = await connection.query(
      `SELECT u.id, u.name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'coach' LIMIT 1`
    );
    const coachId = coaches.length > 0 ? coaches[0].id : null;
    if (!coachId) {
      throw new Error('Please run setup-db first. No coach found.');
    }

    const upsertEkskul = async (name, data) => {
      const [rows] = await connection.query('SELECT id FROM extracurriculars WHERE name = ? LIMIT 1', [name]);
      if (rows.length > 0) {
        const id = rows[0].id;
        await connection.query(`
          UPDATE extracurriculars 
          SET coach_id = ?, description = ?, schedule_day = ?, schedule_time = ?, venue = ?, uniform = ?, 
              category = ?, target_age = ?, max_capacity = ?, is_open_reg = ?, is_paid = ?, competitions_won = ?, 
              avg_progress = ?, status = ?
          WHERE id = ?
        `, [
          coachId, data.description, data.schedule_day, data.schedule_time, data.venue, data.uniform,
          data.category, data.target_age, data.max_capacity, data.is_open_reg, data.is_paid, data.competitions_won,
          data.avg_progress, data.status, id
        ]);
        return id;
      } else {
        const [res] = await connection.query(`
          INSERT INTO extracurriculars (
            name, coach_id, description, schedule_day, schedule_time, venue, uniform, 
            category, target_age, max_capacity, is_open_reg, is_paid, competitions_won, avg_progress, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name, coachId, data.description, data.schedule_day, data.schedule_time, data.venue, data.uniform,
          data.category, data.target_age, data.max_capacity, data.is_open_reg, data.is_paid, data.competitions_won,
          data.avg_progress, data.status
        ]);
        return res.insertId;
      }
    };

    const eRobotics = await upsertEkskul('Robotics Lab', {
      description: 'Klub Robotik membekali siswa dengan keterampilan pemrograman dasar, perakitan perangkat keras, dan logika pemecahan masalah melalui proyek-proyek inovatif menggunakan kit LEGO Mindstorms dan Arduino.',
      schedule_day: 'Sabtu',
      schedule_time: '09:00 - 11:00',
      venue: 'Laboratorium IPA 2',
      uniform: 'Batik Sekolah',
      category: 'Technology & STEM',
      target_age: 'Grade 4-6',
      max_capacity: 24,
      is_open_reg: true,
      is_paid: false,
      competitions_won: 5,
      avg_progress: 'Level 3: Intermediate',
      status: 'active'
    });

    const ePramuka = await upsertEkskul('Scout (Pramuka)', {
      description: 'Kegiatan kepanduan wajib untuk melatih kedisiplinan, kemandirian, kepemimpinan, dan kerja sama tim.',
      schedule_day: 'Jumat',
      schedule_time: '14:00 - 16:00',
      venue: 'Lapangan Utama',
      uniform: 'Seragam Pramuka Lengkap',
      category: 'Art & Scouting',
      target_age: 'Grade 1-6',
      max_capacity: 100,
      is_open_reg: true,
      is_paid: false,
      competitions_won: 2,
      avg_progress: 'Level 2: Intermediate',
      status: 'active'
    });

    const eFootball = await upsertEkskul('Football Club', {
      description: 'Pelatihan teknik sepak bola dasar, taktik bermain, dan pembinaan kebugaran fisik siswa.',
      schedule_day: 'Selasa',
      schedule_time: '15:30 - 17:00',
      venue: 'Lapangan Timur',
      uniform: 'Kaos Olahraga',
      category: 'Sports',
      target_age: 'Grade 1-6',
      max_capacity: 42,
      is_open_reg: true,
      is_paid: false,
      competitions_won: 4,
      avg_progress: 'Level 2: Intermediate',
      status: 'active'
    });

    const eDance = await upsertEkskul('Traditional Dance', {
      description: 'Melatih kelenturan, keindahan, dan apresiasi budaya melalui tarian tradisional Nusantara.',
      schedule_day: 'Rabu',
      schedule_time: '14:00 - 15:30',
      venue: 'Studio Seni A',
      uniform: 'Baju Tari Bebas / Kebaya',
      category: 'Art',
      target_age: 'Grade 1-6',
      max_capacity: 28,
      is_open_reg: true,
      is_paid: false,
      competitions_won: 3,
      avg_progress: 'Level 3: Intermediate',
      status: 'active'
    });

    const eChoir = await upsertEkskul('Junior Choir', {
      description: 'Mengembangkan teknik vokal kelompok, harmonisasi nada, dan kepercayaan diri tampil di depan umum.',
      schedule_day: 'Senin',
      schedule_time: '14:30 - 16:00',
      venue: 'Aula Musik',
      uniform: 'Putih Merah Lengkap',
      category: 'Music',
      target_age: 'Grade 1-6',
      max_capacity: 35,
      is_open_reg: true,
      is_paid: false,
      competitions_won: 1,
      avg_progress: 'Level 2: Intermediate',
      status: 'active'
    });

    console.log('✅ Extracurriculars upserted and detailed.');

    // 4. Seed members in ekskul_members for Robotics Lab
    const [students] = await connection.query('SELECT id, full_name FROM student_profiles LIMIT 10');
    
    console.log(`Found ${students.length} students to seed membership...`);
    
    const progressLevels = ['Level 4: Advanced', 'Level 2: Intermediate', 'Level 3: Intermediate', 'Level 1: Beginner'];
    const rates = [100, 85, 92, 95, 88, 90, 94];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const level = progressLevels[i % progressLevels.length];
      const rate = rates[i % rates.length];
      
      // Link to Robotics Lab
      await connection.query(`
        INSERT INTO ekskul_members (extracurricular_id, student_id, progress_level, attendance_rate)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE progress_level = VALUES(progress_level), attendance_rate = VALUES(attendance_rate)
      `, [eRobotics, student.id, level, rate]);

      // Link some to Football Club too
      if (i % 2 === 0) {
        await connection.query(`
          INSERT INTO ekskul_members (extracurricular_id, student_id, progress_level, attendance_rate)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE progress_level = VALUES(progress_level), attendance_rate = VALUES(attendance_rate)
        `, [eFootball, student.id, 'Level 2: Intermediate', 90]);
      }
    }

    console.log('✅ Mockup membership seeded successfully!');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
