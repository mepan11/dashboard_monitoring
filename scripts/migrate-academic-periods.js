const mysql = require('mysql2/promise');

async function run() {
  console.log('Starting academic periods database migration...');

  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboard_monitoring',
  });

  try {
    const addColumn = async (colName, definition) => {
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM academic_periods LIKE ?
      `, [colName]);
      
      if (columns.length === 0) {
        console.log(`Adding column ${colName}...`);
        await connection.query(`ALTER TABLE academic_periods ADD COLUMN ${colName} ${definition}`);
      } else {
        console.log(`Column ${colName} already exists.`);
      }
    };

    await addColumn('midterm_start_date', 'DATE NULL');
    await addColumn('midterm_end_date', 'DATE NULL');
    await addColumn('final_start_date', 'DATE NULL');
    await addColumn('final_end_date', 'DATE NULL');
    await addColumn('is_released', 'BOOLEAN DEFAULT TRUE');

    console.log('✅ Columns verified/added.');

    console.log('Seeding academic periods detailed data...');

    const upsertPeriod = async (name, year, sem, data) => {
      const [rows] = await connection.query('SELECT id FROM academic_periods WHERE name = ? LIMIT 1', [name]);
      if (rows.length > 0) {
        const id = rows[0].id;
        await connection.query(`
          UPDATE academic_periods 
          SET academic_year = ?, semester = ?, is_active = ?, start_date = ?, end_date = ?, 
              midterm_start_date = ?, midterm_end_date = ?, final_start_date = ?, final_end_date = ?, 
              is_released = ?
          WHERE id = ?
        `, [
          year, sem, data.is_active, data.start_date, data.end_date,
          data.midterm_start_date, data.midterm_end_date, data.final_start_date, data.final_end_date,
          data.is_released, id
        ]);
        return id;
      } else {
        const [res] = await connection.query(`
          INSERT INTO academic_periods (
            name, academic_year, semester, is_active, start_date, end_date, 
            midterm_start_date, midterm_end_date, final_start_date, final_end_date, is_released
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          name, year, sem, data.is_active, data.start_date, data.end_date,
          data.midterm_start_date, data.midterm_end_date, data.final_start_date, data.final_end_date,
          data.is_released
        ]);
        return res.insertId;
      }
    };

    // 2024/2025
    await upsertPeriod('2024/2025 Ganjil', '2024/2025', 1, {
      is_active: true,
      start_date: '2024-07-15',
      end_date: '2024-12-20',
      midterm_start_date: '2024-09-23',
      midterm_end_date: '2024-09-27',
      final_start_date: '2024-12-02',
      final_end_date: '2024-12-13',
      is_released: true
    });

    await upsertPeriod('2024/2025 Genap', '2024/2025', 2, {
      is_active: false,
      start_date: '2025-01-06',
      end_date: '2025-06-20',
      midterm_start_date: '2025-03-10',
      midterm_end_date: '2025-03-14',
      final_start_date: '2025-06-02',
      final_end_date: '2025-06-13',
      is_released: true
    });

    // 2025/2026 (Draft/Mendatang)
    await upsertPeriod('2025/2026 Ganjil', '2025/2026', 1, {
      is_active: false,
      start_date: '2025-07-14',
      end_date: '2025-12-19',
      midterm_start_date: '2025-09-22',
      midterm_end_date: '2025-09-26',
      final_start_date: '2025-12-01',
      final_end_date: '2025-12-12',
      is_released: false
    });

    await upsertPeriod('2025/2026 Genap', '2025/2026', 2, {
      is_active: false,
      start_date: '2026-01-05',
      end_date: '2026-06-19',
      midterm_start_date: '2026-03-09',
      midterm_end_date: '2026-03-13',
      final_start_date: '2026-06-01',
      final_end_date: '2026-06-12',
      is_released: false
    });

    // 2023/2024 (Selesai/Arsip)
    await upsertPeriod('2023/2024 Ganjil', '2023/2024', 1, {
      is_active: false,
      start_date: '2023-07-17',
      end_date: '2023-12-22',
      midterm_start_date: '2023-09-25',
      midterm_end_date: '2023-09-29',
      final_start_date: '2023-12-04',
      final_end_date: '2023-12-15',
      is_released: true
    });

    await upsertPeriod('2023/2024 Genap', '2023/2024', 2, {
      is_active: false,
      start_date: '2024-01-08',
      end_date: '2024-06-21',
      midterm_start_date: '2024-03-11',
      midterm_end_date: '2024-03-15',
      final_start_date: '2024-06-03',
      final_end_date: '2024-06-14',
      is_released: true
    });

    console.log('✅ Academic periods seeded.');
  } finally {
    await connection.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
