const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting academic calendar events database migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    // Create academic_calendar_events table
    console.log('Creating academic_calendar_events table if not exists...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS academic_calendar_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        period_id INT NOT NULL,
        event_name VARCHAR(150) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        event_type VARCHAR(50) NOT NULL, -- holiday, exam, activity
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (period_id) REFERENCES academic_periods(id) ON DELETE CASCADE
      )
    `);

    // Clean up existing events to start fresh
    console.log('Clearing existing calendar events...');
    await connection.query('DELETE FROM academic_calendar_events');

    const addEvent = async (periodId, name, start, end, type) => {
      await connection.query(`
        INSERT INTO academic_calendar_events (period_id, event_name, start_date, end_date, event_type) 
        VALUES (?, ?, ?, ?, ?)
      `, [periodId, name, start, end, type]);
    };

    console.log('Seeding default academic calendar events...');

    // Seeding for 2024/2025 Ganjil (ID 3)
    await addEvent(3, 'Hari Kemerdekaan Republik Indonesia', '2024-08-17', '2024-08-17', 'holiday');
    await addEvent(3, 'Maulid Nabi Muhammad SAW', '2024-09-16', '2024-09-16', 'holiday');
    await addEvent(3, 'Hari Raya Natal', '2024-12-25', '2024-12-25', 'holiday');
    await addEvent(3, 'Penyerahan Rapor Semester Ganjil', '2024-12-20', '2024-12-20', 'activity');
    await addEvent(3, 'Libur Semester Ganjil', '2024-12-21', '2025-01-05', 'holiday');

    // Seeding for 2024/2025 Genap (ID 4)
    await addEvent(4, 'Tahun Baru Imlek 2576 Kongzili', '2025-01-29', '2025-01-29', 'holiday');
    await addEvent(4, 'Hari Raya Nyepi (Tahun Baru Saka 1947)', '2025-03-29', '2025-03-29', 'holiday');
    await addEvent(4, 'Hari Raya Idul Fitri 1446 H', '2025-03-31', '2025-04-01', 'holiday');
    await addEvent(4, 'Wafat Isa Almasih', '2025-04-18', '2025-04-18', 'holiday');
    await addEvent(4, 'Hari Buruh Internasional', '2025-05-01', '2025-05-01', 'holiday');
    await addEvent(4, 'Hari Raya Waisak 2569 BE', '2025-05-12', '2025-05-12', 'holiday');
    await addEvent(4, 'Kenaikan Isa Almasih', '2025-05-29', '2025-05-29', 'holiday');
    await addEvent(4, 'Hari Lahir Pancasila', '2025-06-01', '2025-06-01', 'holiday');
    await addEvent(4, 'Penyerahan Rapor Semester Genap / Kenaikan Kelas', '2025-06-20', '2025-06-20', 'activity');
    await addEvent(4, 'Libur Akhir Tahun Pelajaran', '2025-06-21', '2025-07-12', 'holiday');

    // Seeding for 2025/2026 Ganjil (ID 1)
    await addEvent(1, 'Tahun Baru Islam 1447 Hijriah', '2025-07-27', '2025-07-27', 'holiday');
    await addEvent(1, 'Hari Kemerdekaan Republik Indonesia', '2025-08-17', '2025-08-17', 'holiday');
    await addEvent(1, 'Maulid Nabi Muhammad SAW', '2025-09-05', '2025-09-05', 'holiday');
    await addEvent(1, 'Hari Raya Natal', '2025-12-25', '2025-12-25', 'holiday');
    await addEvent(1, 'Penyerahan Rapor Semester Ganjil', '2025-12-18', '2025-12-18', 'activity');
    await addEvent(1, 'Libur Semester Ganjil', '2025-12-19', '2026-01-04', 'holiday');

    console.log('✅ Academic calendar events seeded successfully.');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
