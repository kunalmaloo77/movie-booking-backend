const db = require('../config/db');

// Fixed list of supported languages. English is first and must always exist —
// it is the app-layer default for shows when no language is supplied.
const FIXED_LANGUAGES = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
];

const createLanguagesTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS languages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    `;
  try {
    await db.query(queryText);
    console.log('Languages table created successfully');
  } catch (error) {
    console.error('Error creating languages table:', error);
  }
};

const seedLanguages = async () => {
  const values = [];
  const placeholders = FIXED_LANGUAGES.map((name, i) => {
    values.push(name);
    return `($${i + 1})`;
  });
  const queryText = `
    INSERT INTO languages (name)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (name) DO NOTHING;
  `;
  try {
    await db.query(queryText, values);
    console.log('Languages seeded successfully');
  } catch (error) {
    console.error('Error seeding languages:', error);
  }
};

const fetchLanguages = async () => {
  const result = await db.query('SELECT id, name FROM languages ORDER BY name;');
  return result.rows;
};

const getLanguageIdByName = async (name) => {
  const result = await db.query(
    'SELECT id FROM languages WHERE name = $1',
    [name]
  );
  return result.rows[0]?.id ?? null;
};

// Resolves the default language id (English). The languages table is always
// seeded at startup, so this never returns null in normal operation.
const getDefaultLanguageId = async () => {
  return getLanguageIdByName('English');
};

module.exports = {
  FIXED_LANGUAGES,
  createLanguagesTable,
  seedLanguages,
  fetchLanguages,
  getLanguageIdByName,
  getDefaultLanguageId,
};
