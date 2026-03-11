const bcrypt = require('bcrypt');
const db = require('../config/db');
const { createUserTable } = require('../models/userModel');

/**
 * This script creates an admin user in the database. You can run it using:
 * node createAdmin.js [username] [email] [password]
 *
 * If you don't provide command line arguments, it will default to:
 * username: admin
 * email: admin@example.com
 * password: admin123
 */

const createAdmin = async () => {
  try {
    await createUserTable();

    const username = process.argv[2] || 'admin';
    const email = process.argv[3] || 'admin@example.com';
    const password = process.argv[4] || 'admin123';

    // Check if admin already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists with email:', email);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.query(
      `INSERT INTO users (username, email, password, role)
             VALUES ($1, $2, $3, 'ADMIN')
             RETURNING id, username, email, role, created_at`,
      [username, email, hashedPassword]
    );

    console.log('Admin user created successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    process.exit();
  }
};

createAdmin()
  .then(() => {
    console.log('Admin creation process completed.');
  })
  .catch((error) => {
    console.error('Unexpected error during admin creation:', error);
    process.exit(1);
  });
