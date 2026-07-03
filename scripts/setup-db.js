const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function run() {
  console.log('Starting database setup and seeding...');

  // Connect to MySQL (without database first)
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

  try {
    // 1. Create Database if not exists
    await connection.query('CREATE DATABASE IF NOT EXISTS dashboard_monitoring');
    console.log('Database dashboard_monitoring verified/created.');

    // 2. Switch to Database
    await connection.query('USE dashboard_monitoring');

    // 3. Read and run SQL schema
    const schemaPath = path.join(__dirname, '..', 'tmp', 'dashboard-monitoring.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Simple split by semicolon. We clean comments line-by-line first.
    const cleanLines = schemaSql
      .split('\n')
      .map(line => {
        const trimLine = line.trim();
        if (trimLine.startsWith('--')) {
          return '';
        }
        return line;
      })
      .join('\n');

    // Now split by semicolon
    const statements = cleanLines
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Executing ${statements.length} schema statements...`);
    for (const stmt of statements) {
      try {
        await connection.query(stmt);
      } catch (err) {
        console.error('Failed executing statement:', stmt);
        throw err;
      }
    }
    console.log('Database tables created successfully.');

    // 4. Seeding data
    console.log('Checking existing data to prevent duplicate seeds...');
    
    // Check if tables have data. We first check if roles exist.
    const [rolesCount] = await connection.query('SELECT COUNT(*) as count FROM roles');
    if (rolesCount[0].count > 0) {
      console.log('Database already seeded. Skipping seed process.');
      return;
    }

    console.log('Seeding roles...');
    await connection.query(`
      INSERT INTO roles (id, name, description) VALUES
      (1, 'super_admin', 'Administrator with full system access'),
      (2, 'principal', 'School Principal with view-only oversight'),
      (3, 'teacher', 'Classroom teachers who manage grades and student attendance'),
      (4, 'parent', 'Wali murid who views child metrics'),
      (5, 'coach', 'Extracurricular coaches who manage ekskul attendance and logs')
    `);

    console.log('Seeding users...');
    const saltRounds = 10;
    const adminHash = bcrypt.hashSync('admin123', saltRounds);
    const principalHash = bcrypt.hashSync('principal123', saltRounds);
    const teacher1Hash = bcrypt.hashSync('teacher123', saltRounds);
    const teacher2Hash = bcrypt.hashSync('teacher123', saltRounds);
    const parent1Hash = bcrypt.hashSync('parent123', saltRounds);
    const parent2Hash = bcrypt.hashSync('parent123', saltRounds);
    const coach1Hash = bcrypt.hashSync('coach123', saltRounds);
    const coach2Hash = bcrypt.hashSync('coach123', saltRounds);

    const usersToInsert = [
      ['Super Admin', 'admin@school.sch.id', adminHash, '08111111111'],
      ['Kepala Sekolah (Dr. H. Ahmad)', 'kepsek@school.sch.id', principalHash, '08122222222'],
      ['Sri Wahyuni, S.Pd.', 'guru1@school.sch.id', teacher1Hash, '08133333333'],
      ['Subandi, S.Pd.', 'guru2@school.sch.id', teacher2Hash, '08144444444'],
      ['Budi Hartono (Parent of Budi)', 'ortu1@school.sch.id', parent1Hash, '08155555555'],
      ['Diana Lestari (Parent of Andi)', 'ortu2@school.sch.id', parent2Hash, '08166666666'],
      ['Coach Bambang (Pramuka)', 'pelatih1@school.sch.id', coach1Hash, '08177777777'],
      ['Coach Rahmat (Futsal)', 'pelatih2@school.sch.id', coach2Hash, '08188888888']
    ];

    const userIds = {};
    for (const u of usersToInsert) {
      const [res] = await connection.query(
        'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
        u
      );
      userIds[u[1]] = res.insertId;
    }

    console.log('Seeding user roles...');
    const userRoles = [
      [userIds['admin@school.sch.id'], 1],
      [userIds['kepsek@school.sch.id'], 2],
      [userIds['guru1@school.sch.id'], 3],
      [userIds['guru2@school.sch.id'], 3],
      [userIds['ortu1@school.sch.id'], 4],
      [userIds['ortu2@school.sch.id'], 4],
      [userIds['pelatih1@school.sch.id'], 5],
      [userIds['pelatih2@school.sch.id'], 5]
    ];
    for (const ur of userRoles) {
      await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', ur);
    }

    console.log('Seeding profiles...');
    // Admin profile
    await connection.query(
      'INSERT INTO admin_profiles (user_id, nik, position_title) VALUES (?, ?, ?)',
      [userIds['admin@school.sch.id'], '1234567890123456', 'Kepala Tata Usaha']
    );

    // Principal profile
    await connection.query(
      'INSERT INTO principal_profiles (user_id, nuptk, nip, appointment_date) VALUES (?, ?, ?, ?)',
      [userIds['kepsek@school.sch.id'], '2222777788889999', '197508122000031002', '2020-07-15']
    );

    // Teacher profiles
    await connection.query(
      'INSERT INTO teacher_profiles (user_id, nuptk, nip, employment_status) VALUES (?, ?, ?, ?)',
      [userIds['guru1@school.sch.id'], '8888111122223333', '198205042008012003', 'PNS']
    );
    await connection.query(
      'INSERT INTO teacher_profiles (user_id, nuptk, nip, employment_status) VALUES (?, ?, ?, ?)',
      [userIds['guru2@school.sch.id'], '8888111122223334', null, 'Honorer']
    );

    // Coach profiles
    await connection.query(
      'INSERT INTO coach_profiles (user_id, expertise_field, certification) VALUES (?, ?, ?)',
      [userIds['pelatih1@school.sch.id'], 'Kepramukaan', 'KPL Kwartir Nasional']
    );
    await connection.query(
      'INSERT INTO coach_profiles (user_id, expertise_field, certification) VALUES (?, ?, ?)',
      [userIds['pelatih2@school.sch.id'], 'Futsal & Sepakbola', 'Lisensi C AFC']
    );

    console.log('Seeding classes...');
    const [class1A] = await connection.query(
      'INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES (?, ?, ?)',
      ['1A', 1, userIds['guru1@school.sch.id']]
    );
    const [class4A] = await connection.query(
      'INSERT INTO classes (name, grade_level, homeroom_teacher_id) VALUES (?, ?, ?)',
      ['4A', 4, userIds['guru2@school.sch.id']]
    );

    console.log('Seeding student profiles...');
    const [student1] = await connection.query(
      'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1001', '0011223344', 'Budi Santoso', class1A.insertId, 'male', '2019-04-12', 'Jl. Kenari No. 10, Jakarta']
    );
    const [student2] = await connection.query(
      'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['1002', '0011223345', 'Lani Lestari', class1A.insertId, 'female', '2019-09-24', 'Jl. Merpati No. 34, Jakarta']
    );
    const [student3] = await connection.query(
      'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['4001', '0044556677', 'Andi Wijaya', class4A.insertId, 'male', '2016-01-15', 'Jl. Dahlia No. 4, Jakarta']
    );
    const [student4] = await connection.query(
      'INSERT INTO student_profiles (nis, nisn, full_name, class_id, gender, birth_date, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['4002', '0044556678', 'Siti Rahma', class4A.insertId, 'female', '2016-08-08', 'Jl. Cempaka No. 8, Jakarta']
    );

    console.log('Seeding parent profiles...');
    await connection.query(
      'INSERT INTO parent_profiles (user_id, occupation, address, student_id) VALUES (?, ?, ?, ?)',
      [userIds['ortu1@school.sch.id'], 'Wiraswasta', 'Jl. Kenari No. 10, Jakarta', student1.insertId]
    );
    await connection.query(
      'INSERT INTO parent_profiles (user_id, occupation, address, student_id) VALUES (?, ?, ?, ?)',
      [userIds['ortu2@school.sch.id'], 'Pegawai Swasta', 'Jl. Dahlia No. 4, Jakarta', student3.insertId]
    );

    console.log('Seeding subjects...');
    // Core Academic subjects
    const [subMtk] = await connection.query(
      'INSERT INTO subjects (code, name, category, grade_level, is_core) VALUES (?, ?, ?, ?, ?)',
      ['MTK', 'Matematika', 'Academic', '1,2,3,4,5,6', true]
    );
    const [subBindo] = await connection.query(
      'INSERT INTO subjects (code, name, category, grade_level, is_core) VALUES (?, ?, ?, ?, ?)',
      ['BINDO', 'Bahasa Indonesia', 'Academic', '1,2,3,4,5,6', true]
    );
    const [subIpa] = await connection.query(
      'INSERT INTO subjects (code, name, category, grade_level, is_core) VALUES (?, ?, ?, ?, ?)',
      ['IPA', 'Ilmu Pengetahuan Alam', 'Academic', '4,5,6', true]
    );
    
    // Extracurricular subjects for report card
    const [subPramuka] = await connection.query(
      'INSERT INTO subjects (code, name, category, grade_level, is_core) VALUES (?, ?, ?, ?, ?)',
      ['PRAMUKA', 'Ekstrakurikuler Pramuka', 'ArtSport', '1,2,3,4,5,6', false]
    );
    const [subFutsal] = await connection.query(
      'INSERT INTO subjects (code, name, category, grade_level, is_core) VALUES (?, ?, ?, ?, ?)',
      ['FUTSAL', 'Ekstrakurikuler Futsal', 'ArtSport', '3,4,5,6', false]
    );

    console.log('Seeding academic periods...');
    const [period] = await connection.query(
      'INSERT INTO academic_periods (name, academic_year, semester, is_active, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      ['2025/2026 Ganjil', '2025/2026', 1, true, '2025-07-14', '2025-12-18']
    );

    console.log('Seeding teacher subjects...');
    await connection.query(
      'INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
      [userIds['guru1@school.sch.id'], subMtk.insertId, class1A.insertId]
    );
    await connection.query(
      'INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
      [userIds['guru1@school.sch.id'], subBindo.insertId, class1A.insertId]
    );
    await connection.query(
      'INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)',
      [userIds['guru2@school.sch.id'], subIpa.insertId, class4A.insertId]
    );

    console.log('Seeding extracurriculars...');
    const [ekskulPramuka] = await connection.query(
      'INSERT INTO extracurriculars (name, coach_id, description) VALUES (?, ?, ?)',
      ['Pramuka', userIds['pelatih1@school.sch.id'], 'Ekstrakurikuler Kepanduan Pramuka Wajib']
    );
    const [ekskulFutsal] = await connection.query(
      'INSERT INTO extracurriculars (name, coach_id, description) VALUES (?, ?, ?)',
      ['Futsal', userIds['pelatih2@school.sch.id'], 'Ekskul Futsal Olahraga Prestasi']
    );

    console.log('Seeding lesson logs...');
    await connection.query(
      `INSERT INTO lesson_logs (teacher_id, subject_id, class_id, topic, start_time, end_time, duration_minutes, summary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds['guru2@school.sch.id'],
        subIpa.insertId,
        class4A.insertId,
        'Proses Erosi',
        '08:00:00',
        '09:30:00',
        90,
        'Proses erosi adalah pengikisan permukaan bumi oleh air, angin, atau es. Guru membawakan media pembelajaran visual.'
      ]
    );
    await connection.query(
      `INSERT INTO lesson_logs (teacher_id, subject_id, class_id, topic, start_time, end_time, duration_minutes, summary) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds['guru1@school.sch.id'],
        subMtk.insertId,
        class1A.insertId,
        'Penjumlahan 1-10',
        '07:30:00',
        '09:00:00',
        90,
        'Mengajarkan murid kelas 1 penjumlahan angka 1 sampai 10 menggunakan media buah-buahan.'
      ]
    );

    console.log('Seeding attendance sessions & records...');
    // Class 1A Daily Attendance (Students present)
    const [sess1] = await connection.query(
      'INSERT INTO attendance_sessions (class_id, teacher_id, session_date, session_type) VALUES (?, ?, ?, ?)',
      [class1A.insertId, userIds['guru1@school.sch.id'], '2026-07-01', 'daily']
    );
    await connection.query(
      'INSERT INTO attendance_records (session_id, student_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sess1.insertId, student1.insertId, 'present', userIds['guru1@school.sch.id']]
    );
    await connection.query(
      'INSERT INTO attendance_records (session_id, student_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sess1.insertId, student2.insertId, 'present', userIds['guru1@school.sch.id']]
    );

    // Class 4A IPA Subject Attendance
    const [sess2] = await connection.query(
      'INSERT INTO attendance_sessions (class_id, subject_id, teacher_id, session_date, session_type) VALUES (?, ?, ?, ?, ?)',
      [class4A.insertId, subIpa.insertId, userIds['guru2@school.sch.id'], '2026-07-02', 'subject']
    );
    await connection.query(
      'INSERT INTO attendance_records (session_id, student_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sess2.insertId, student3.insertId, 'present', userIds['guru2@school.sch.id']]
    );
    await connection.query(
      'INSERT INTO attendance_records (session_id, student_id, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [sess2.insertId, student4.insertId, 'sick', 'Sakit Demam Tinggi', userIds['guru2@school.sch.id']]
    );

    // Staff Daily Attendance for Guru 1 & Coach 1
    const [sessStaff] = await connection.query(
      'INSERT INTO attendance_sessions (class_id, teacher_id, session_date, session_type) VALUES (?, ?, ?, ?)',
      [null, userIds['admin@school.sch.id'], '2026-07-02', 'staff']
    );
    // Guru 1 present
    await connection.query(
      'INSERT INTO attendance_records (session_id, user_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sessStaff.insertId, userIds['guru1@school.sch.id'], 'present', userIds['admin@school.sch.id']]
    );
    // Guru 2 present
    await connection.query(
      'INSERT INTO attendance_records (session_id, user_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sessStaff.insertId, userIds['guru2@school.sch.id'], 'present', userIds['admin@school.sch.id']]
    );
    // Coach 1 present
    await connection.query(
      'INSERT INTO attendance_records (session_id, user_id, status, recorded_by) VALUES (?, ?, ?, ?)',
      [sessStaff.insertId, userIds['pelatih1@school.sch.id'], 'present', userIds['admin@school.sch.id']]
    );
    // Coach 2 sick
    await connection.query(
      'INSERT INTO attendance_records (session_id, user_id, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?)',
      [sessStaff.insertId, userIds['pelatih2@school.sch.id'], 'sick', 'Izin sakit gigi', userIds['admin@school.sch.id']]
    );

    console.log('Seeding grades...');
    const academicPeriodId = period.insertId;

    // Student 1 (Budi) Matematika grades
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student1.insertId, subMtk.insertId, academicPeriodId, userIds['guru1@school.sch.id'], 'assignment', 85.00, 'LKS MTK Halaman 15']
    );
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student1.insertId, subMtk.insertId, academicPeriodId, userIds['guru1@school.sch.id'], 'midterm', 80.00, 'UTS Ganjil']
    );
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student1.insertId, subMtk.insertId, academicPeriodId, userIds['guru1@school.sch.id'], 'final', 90.00, 'UAS Ganjil']
    );

    // Student 3 (Andi) IPA grades
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student3.insertId, subIpa.insertId, academicPeriodId, userIds['guru2@school.sch.id'], 'assignment', 90.00, 'LKS IPA Halaman 20 - Erosi']
    );
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student3.insertId, subIpa.insertId, academicPeriodId, userIds['guru2@school.sch.id'], 'midterm', 88.00, 'UTS Ganjil']
    );
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student3.insertId, subIpa.insertId, academicPeriodId, userIds['guru2@school.sch.id'], 'final', 85.00, 'UAS Ganjil']
    );

    // Extracurricular grades (Pramuka and Futsal) stored in grades table!
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student1.insertId, subPramuka.insertId, academicPeriodId, userIds['pelatih1@school.sch.id'], 'final', 85.00, 'Nilai akhir Ekskul Pramuka']
    );
    await connection.query(
      'INSERT INTO grades (student_id, subject_id, period_id, teacher_id, type, score, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [student3.insertId, subFutsal.insertId, academicPeriodId, userIds['pelatih2@school.sch.id'], 'final', 90.00, 'Nilai akhir Ekskul Futsal']
    );

    console.log('Seeding ekskul attendances...');
    await connection.query(
      'INSERT INTO ekskul_attendances (extracurricular_id, student_id, session_date, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [ekskulPramuka.insertId, student1.insertId, '2026-07-02', 'present', 'Latihan baris berbaris', userIds['pelatih1@school.sch.id']]
    );
    await connection.query(
      'INSERT INTO ekskul_attendances (extracurricular_id, student_id, session_date, status, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [ekskulFutsal.insertId, student3.insertId, '2026-07-02', 'present', 'Latihan dribbling & passing', userIds['pelatih2@school.sch.id']]
    );

    console.log('Seeding ekskul logs...');
    await connection.query(
      'INSERT INTO ekskul_logs (extracurricular_id, activity_date, activity_name, description) VALUES (?, ?, ?, ?)',
      [ekskulPramuka.insertId, '2026-07-02', 'Pemberian Materi Sandi Morse', 'Latihan sandi morse dasar dan sandi rumput di lapangan sekolah. Murid antusias.']
    );
    await connection.query(
      'INSERT INTO ekskul_logs (extracurricular_id, activity_date, activity_name, description) VALUES (?, ?, ?, ?)',
      [ekskulFutsal.insertId, '2026-07-02', 'Simulasi Pertandingan', 'Latihan tanding antar regu internal untuk melatih transisi bertahan dan menyerang.']
    );

    console.log('All mock data seeded successfully!');

  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
