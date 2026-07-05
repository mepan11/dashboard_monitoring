const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting dashboard migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // 1. Create announcements table
    console.log('Creating announcements table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id         INT PRIMARY KEY AUTO_INCREMENT,
        title      VARCHAR(200) NOT NULL,
        content    TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ announcements table ready.');

    // 2. Create school_events table
    console.log('Creating school_events table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS school_events (
        id          INT PRIMARY KEY AUTO_INCREMENT,
        title       VARCHAR(200) NOT NULL,
        event_date  DATE NOT NULL,
        end_date    DATE,
        category    ENUM('Akademik','Libur','Kegiatan','Ujian','Lainnya') DEFAULT 'Kegiatan',
        description TEXT,
        created_by  INT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ school_events table ready.');

    // 3. Create activity_logs table
    console.log('Creating activity_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id         INT PRIMARY KEY AUTO_INCREMENT,
        user_id    INT,
        user_name  VARCHAR(100),
        activity   VARCHAR(300) NOT NULL,
        category   ENUM('Akademik','Absensi','Data Siswa','Sistem','Ekskul') DEFAULT 'Sistem',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ activity_logs table ready.');

    // 4. Seed sample data if tables are empty
    const [annCount] = await connection.query('SELECT COUNT(*) as count FROM announcements');
    if (annCount[0].count === 0) {
      console.log('Seeding announcements...');
      const [adminRow] = await connection.query(
        `SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'super_admin' LIMIT 1`
      );
      const adminId = adminRow.length > 0 ? adminRow[0].id : null;

      await connection.query(`
        INSERT INTO announcements (title, content, created_by) VALUES
        (?, ?, ?),
        (?, ?, ?)
      `, [
        'Persiapan Upacara HUT RI',
        'Diharapkan seluruh guru dan staf hadir pukul 07.00 untuk gladi bersih upacara peringatan HUT RI. Pakaian resmi seragam dinas.',
        adminId,
        'Jadwal Vaksinasi Tahap 2',
        'Pelaksanaan vaksinasi untuk siswa kelas 1-3 akan dilaksanakan di aula sekolah. Orang tua dimohon hadir mendampingi.',
        adminId
      ]);
      console.log('✅ Announcements seeded.');
    }

    const [evCount] = await connection.query('SELECT COUNT(*) as count FROM school_events');
    if (evCount[0].count === 0) {
      console.log('Seeding school_events...');
      const [adminRow] = await connection.query(
        `SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = 'super_admin' LIMIT 1`
      );
      const adminId = adminRow.length > 0 ? adminRow[0].id : null;

      const now = new Date();
      const thisYear = now.getFullYear();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const twoMonths = new Date(now.getFullYear(), now.getMonth() + 2, 1);

      const fmt = (d) => d.toISOString().split('T')[0];

      await connection.query(
        `INSERT INTO school_events (title, event_date, category, description, created_by) VALUES
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?)`,
        [
          `HUT RI ke-${thisYear - 1945}`, fmt(new Date(thisYear, 7, 17)), 'Libur', 'Hari Kemerdekaan Republik Indonesia', adminId,
          'Pentas Seni', fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15)), 'Kegiatan', 'Acara tahunan pentas seni dan budaya sekolah', adminId,
          'Ujian Tengah Semester', fmt(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10)), 'Ujian', 'Pelaksanaan Ujian Tengah Semester Ganjil', adminId,
          'Hari Guru Nasional', fmt(new Date(thisYear, 10, 25)), 'Kegiatan', 'Peringatan Hari Guru Nasional', adminId,
        ]
      );
      console.log('✅ School events seeded.');
    }

    const [logCount] = await connection.query('SELECT COUNT(*) as count FROM activity_logs');
    if (logCount[0].count === 0) {
      console.log('Seeding activity_logs...');
      await connection.query(`
        INSERT INTO activity_logs (user_name, activity, category) VALUES
        (?, ?, ?),
        (?, ?, ?),
        (?, ?, ?)
      `, [
        'Admin Utama', 'Inisialisasi sistem dashboard monitoring', 'Sistem',
        'Sri Wahyuni, S.Pd.', 'Input nilai Matematika Kelas 1A', 'Akademik',
        'Subandi, S.Pd.', 'Melakukan absensi pagi Kelas 4A', 'Absensi',
      ]);
      console.log('✅ Activity logs seeded.');
    }

    console.log('\n🎉 Dashboard migration completed successfully!');
    console.log('You can now run: npm run dev');

  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
