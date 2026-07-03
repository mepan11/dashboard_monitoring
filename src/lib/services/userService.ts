import pool from '../db';
import { hashPassword } from '../auth';

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role: 'super_admin' | 'principal' | 'teacher' | 'parent' | 'coach';
  // Profile specific fields
  nuptk?: string; // teacher, principal
  nip?: string;   // teacher, principal
  employment_status?: 'PNS' | 'PPPK' | 'Honorer' | 'Swasta'; // teacher
  appointment_date?: string; // principal
  occupation?: string; // parent
  address?: string; // parent
  student_id?: number; // parent (linked child)
  expertise_field?: string; // coach
  certification?: string; // coach
  nik?: string; // admin
  position_title?: string; // admin
}

export async function getUsers() {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.email, u.phone, u.is_active, r.name as role 
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    ORDER BY u.id DESC
  `);
  return rows as any[];
}

export async function getUsersByRole(roleName: string) {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.email, u.phone, u.is_active, r.name as role
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE r.name = ?
    ORDER BY u.id DESC
  `, [roleName]);
  return rows as any[];
}

export async function getTeacherProfiles() {
  const [rows] = await pool.query(`
    SELECT u.id as user_id, u.name, u.email, u.phone, tp.id as profile_id, tp.nuptk, tp.nip, tp.employment_status
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN teacher_profiles tp ON u.id = tp.user_id
    ORDER BY u.name ASC
  `);
  return rows as any[];
}

export async function getCoachProfiles() {
  const [rows] = await pool.query(`
    SELECT u.id as user_id, u.name, u.email, u.phone, cp.id as profile_id, cp.expertise_field, cp.certification
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN coach_profiles cp ON u.id = cp.user_id
    ORDER BY u.name ASC
  `);
  return rows as any[];
}

export async function getParentProfiles() {
  const [rows] = await pool.query(`
    SELECT u.id as user_id, u.name, u.email, u.phone, pp.id as profile_id, pp.occupation, pp.address, pp.student_id, sp.full_name as student_name
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN parent_profiles pp ON u.id = pp.user_id
    JOIN student_profiles sp ON pp.student_id = sp.id
    ORDER BY u.name ASC
  `);
  return rows as any[];
}

export async function getPrincipalProfile() {
  const [rows] = (await pool.query(`
    SELECT u.id as user_id, u.name, u.email, u.phone, pp.id as profile_id, pp.nuptk, pp.nip, pp.appointment_date
    FROM users u
    JOIN user_roles ur ON u.id = ur.user_id
    JOIN principal_profiles pp ON u.id = pp.user_id
    LIMIT 1
  `)) as any;
  return rows[0] as any | undefined;
}

export async function createUserAccount(input: UserInput) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Get role ID
    const [roles] = await conn.query('SELECT id FROM roles WHERE name = ?', [input.role]);
    if ((roles as any[]).length === 0) {
      throw new Error(`Role ${input.role} not found`);
    }
    const roleId = (roles as any[])[0].id;

    // 2. Hash password
    const pwd = input.password || 'sekolah123'; // Default password
    const passwordHash = hashPassword(pwd);

    // 3. Insert user
    const [userRes] = await conn.query(
      'INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
      [input.name, input.email, passwordHash, input.phone || null]
    );
    const userId = (userRes as any).insertId;

    // 4. Insert user role
    await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

    // 5. Insert role-specific profile
    if (input.role === 'teacher') {
      await conn.query(
        'INSERT INTO teacher_profiles (user_id, nuptk, nip, employment_status) VALUES (?, ?, ?, ?)',
        [userId, input.nuptk || '', input.nip || null, input.employment_status || null]
      );
    } else if (input.role === 'coach') {
      await conn.query(
        'INSERT INTO coach_profiles (user_id, expertise_field, certification) VALUES (?, ?, ?)',
        [userId, input.expertise_field || '', input.certification || null]
      );
    } else if (input.role === 'parent') {
      if (!input.student_id) {
        throw new Error('student_id is required for parent profile');
      }
      await conn.query(
        'INSERT INTO parent_profiles (user_id, occupation, address, student_id) VALUES (?, ?, ?, ?)',
        [userId, input.occupation || null, input.address || null, input.student_id]
      );
    } else if (input.role === 'principal') {
      // Check if principal already exists
      const [existing] = await conn.query(
        'SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = "principal"'
      );
      if ((existing as any[]).length > 0) {
        throw new Error('Principal account already exists. Only one principal is allowed.');
      }
      await conn.query(
        'INSERT INTO principal_profiles (user_id, nuptk, nip, appointment_date) VALUES (?, ?, ?, ?)',
        [userId, input.nuptk || null, input.nip || null, input.appointment_date || null]
      );
    } else if (input.role === 'super_admin') {
      await conn.query(
        'INSERT INTO admin_profiles (user_id, nik, position_title) VALUES (?, ?, ?)',
        [userId, input.nik || null, input.position_title || null]
      );
    }

    await conn.commit();
    return userId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function updateUserAccount(userId: number, input: UserInput) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 1. Update basic user details
    if (input.password) {
      const passwordHash = hashPassword(input.password);
      await conn.query(
        'UPDATE users SET name = ?, email = ?, password_hash = ?, phone = ? WHERE id = ?',
        [input.name, input.email, passwordHash, input.phone || null, userId]
      );
    } else {
      await conn.query(
        'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
        [input.name, input.email, input.phone || null, userId]
      );
    }

    // 2. Update role-specific profile
    if (input.role === 'teacher') {
      await conn.query(
        'UPDATE teacher_profiles SET nuptk = ?, nip = ?, employment_status = ? WHERE user_id = ?',
        [input.nuptk || '', input.nip || null, input.employment_status || null, userId]
      );
    } else if (input.role === 'coach') {
      await conn.query(
        'UPDATE coach_profiles SET expertise_field = ?, certification = ? WHERE user_id = ?',
        [input.expertise_field || '', input.certification || null, userId]
      );
    } else if (input.role === 'parent') {
      await conn.query(
        'UPDATE parent_profiles SET occupation = ?, address = ?, student_id = ? WHERE user_id = ?',
        [input.occupation || null, input.address || null, input.student_id, userId]
      );
    } else if (input.role === 'principal') {
      await conn.query(
        'UPDATE principal_profiles SET nuptk = ?, nip = ?, appointment_date = ? WHERE user_id = ?',
        [input.nuptk || null, input.nip || null, input.appointment_date || null, userId]
      );
    } else if (input.role === 'super_admin') {
      await conn.query(
        'UPDATE admin_profiles SET nik = ?, position_title = ? WHERE user_id = ?',
        [input.nik || null, input.position_title || null, userId]
      );
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteUserAccount(userId: number) {
  // Cascading deletes in schema will remove the profiles automatically
  await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  return true;
}
