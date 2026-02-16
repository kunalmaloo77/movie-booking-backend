const db = require('../config/db');

const createUserTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'USER',
      region_id INT REFERENCES regions(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(queryText);
    console.log('User table created successfully');
  } catch (error) {
    console.error('Error creating user table:', error);
  }
};

const createUser = async (username, email, password) => {
  const queryText = `
    INSERT INTO users (username, email, password)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, role, created_at;
  `;
  const values = [username, email, password];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const queryText = 'SELECT * FROM users WHERE email = $1';
  const result = await db.query(queryText, [email]);
  return result.rows[0];
};

const getUserRoleFromId = async (id) => {
  const queryText = `
    SELECT role 
    FROM users 
    WHERE id = $1
  `;
  const result = await db.query(queryText, [id]);
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  return result.rows[0].role;
}

module.exports = {
  createUserTable,
  createUser,
  findUserByEmail,
  getUserRoleFromId,
};
