-- Primary School Dashboard Monitoring System Database Schema

CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) UNIQUE NOT NULL COMMENT 'super_admin, principal, teacher, parent, coach',
    description VARCHAR(100) NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NULL,
    avatar VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP NULL,
    remember_token VARCHAR(100) NULL,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(10) NOT NULL COMMENT 'Misal: 1A, 6B',
    grade_level TINYINT NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
    homeroom_teacher_id INT NULL COMMENT 'Guru wali kelas (FK ke users)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL COMMENT 'Bisa NULL jika murid tidak punya akun login',
    nis VARCHAR(20) UNIQUE NOT NULL,
    nisn VARCHAR(10) UNIQUE NULL COMMENT 'Nomor Induk Siswa Nasional',
    full_name VARCHAR(100) NOT NULL,
    class_id INT NOT NULL,
    gender ENUM('male', 'female') NULL,
    birth_date DATE NULL,
    address TEXT NULL,
    parent_phone VARCHAR(15) NULL COMMENT 'Nomor HP orang tua untuk notifikasi',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(10) UNIQUE NOT NULL COMMENT 'Kode: MTK, BINDO, IPA, IPS, dst.',
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NULL COMMENT 'Academic, Religion, Language, ArtSport, Local',
    grade_level VARCHAR(10) NULL COMMENT '1-6, misal "4,5,6" atau NULL untuk semua',
    is_core BOOLEAN DEFAULT TRUE COMMENT 'True = pelajaran inti, False = muatan lokal/ekskul',
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academic_periods (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(30) NOT NULL COMMENT 'Misal: 2025/2026 Ganjil',
    academic_year VARCHAR(9) NOT NULL COMMENT '2025/2026',
    semester TINYINT NOT NULL CHECK (semester IN (1,2)),
    is_active BOOLEAN DEFAULT FALSE,
    start_date DATE NULL,
    end_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extracurriculars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'Pramuka, Futsal, Seni Tari, dst.',
    coach_id INT NOT NULL COMMENT 'FK ke users (role coach)',
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    class_id INT NOT NULL COMMENT 'Guru ini mengajar mapel ini di kelas mana',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_subject_class (teacher_id, subject_id, class_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    class_id INT NULL, -- NULL for staff attendance
    subject_id INT NULL COMMENT 'NULL jika absen pagi (daily)',
    teacher_id INT NOT NULL COMMENT 'Guru/User yang melakukan absensi',
    session_date DATE NOT NULL,
    session_type ENUM('daily', 'subject', 'staff') NOT NULL DEFAULT 'daily',
    start_time TIME NULL,
    end_time TIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    student_id INT NULL, -- NULL for staff attendance
    user_id INT NULL,    -- Populated with teacher/coach user ID for staff attendance
    status ENUM('present', 'sick', 'permission', 'absent', 'late') NOT NULL,
    arrival_time TIME NULL COMMENT 'Diisi jika status = late',
    notes TEXT NULL,
    recorded_by INT NOT NULL COMMENT 'User yang mencatat (bisa guru/admin/self)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance_record_student (session_id, student_id),
    UNIQUE KEY unique_attendance_record_user (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS grades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    period_id INT NOT NULL COMMENT 'Merujuk ke academic_periods',
    teacher_id INT NOT NULL COMMENT 'Guru pemberi nilai',
    type ENUM('assignment', 'midterm', 'final') NOT NULL COMMENT 'Tugas, UTS, UAS',
    score DECIMAL(5,2) NULL COMMENT 'Nilai angka (0-100)',
    grade_letter VARCHAR(2) NULL COMMENT 'Opsional: A, B, C, D',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (period_id) REFERENCES academic_periods(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade (student_id, subject_id, period_id, type)
);

CREATE TABLE IF NOT EXISTS ekskul_attendances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    extracurricular_id INT NOT NULL,
    student_id INT NOT NULL,
    session_date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL DEFAULT 'present',
    notes TEXT NULL,
    recorded_by INT NOT NULL COMMENT 'Coach atau admin yang mencatat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_ekskul_attendance (extracurricular_id, student_id, session_date)
);

CREATE TABLE IF NOT EXISTS parent_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL COMMENT '1 akun login per orang tua',
    occupation VARCHAR(100) NULL,
    address TEXT NULL,
    student_id INT NOT NULL COMMENT 'Anak yang diwalikan. Jika punya 2 anak, buat 2 baris.',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS principal_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    nuptk VARCHAR(16) NULL COMMENT 'Kepsek biasanya juga guru, bisa punya NUPTK',
    nip VARCHAR(18) NULL,
    appointment_date DATE NULL COMMENT 'Tanggal mulai menjabat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coach_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    expertise_field VARCHAR(100) NULL COMMENT 'Bidang keahlian, misal: Olahraga, Musik, Pramuka',
    certification VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    nik VARCHAR(16) UNIQUE NULL COMMENT 'Nomor KTP',
    position_title VARCHAR(100) NULL COMMENT 'Jabatan struktural, misal: Kepala TU',
    access_scope JSON NULL COMMENT 'Array menu yang diizinkan, null = akses semua',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    nuptk VARCHAR(16) UNIQUE NOT NULL COMMENT 'Nomor Unik Guru (16 digit)',
    nip VARCHAR(18) NULL COMMENT 'Nomor Induk Pegawai (jika PNS/PPPK)',
    employment_status ENUM('PNS', 'PPPK', 'Honorer', 'Swasta') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Store teacher's lesson summaries and records
CREATE TABLE IF NOT EXISTS lesson_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    class_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL COMMENT 'Materi yang dipelajari',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL COMMENT 'Jumlah jam belajar dalam menit',
    summary TEXT NOT NULL COMMENT 'Rangkuman materi',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

-- Store coach's extracurricular activity logs
CREATE TABLE IF NOT EXISTS ekskul_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    extracurricular_id INT NOT NULL,
    activity_date DATE NOT NULL,
    activity_name VARCHAR(255) NOT NULL COMMENT 'Nama kegiatan/materi latihan',
    description TEXT NULL COMMENT 'Deskripsi/rekap kegiatan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (extracurricular_id) REFERENCES extracurriculars(id) ON DELETE CASCADE
);