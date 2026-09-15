const db = require('../config/db');
const AppError = require('../utils/AppError.js');

const createRegionTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      city_code VARCHAR(100) UNIQUE NOT NULL,
      city_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(queryText);
    console.log('Region table created successfully');
  } catch (error) {
    console.error('Error creating region table:', error);
  }
};

const createRegion = async (city_code, city_name) => {
  const queryText = `
    INSERT INTO regions (city_code, city_name)
    VALUES ($1, $2)
    RETURNING id, city_code, city_name, created_at;
  `;
  const values = [city_code, city_name];
  const result = await db.query(queryText, values);
  return result.rows[0];
};

const findRegions = async (search = null, page = 1, limit = 10) => {
  const PAGE_LIMIT = limit;
  const offset = (page - 1) * PAGE_LIMIT;
  const values = search ? [`%${search}%`] : [];
  const whereClause = search
    ? 'WHERE city_name ILIKE $1 OR city_code ILIKE $1'
    : '';

  const queryText = `
    SELECT id, city_code, city_name, created_at, COUNT(*) OVER() AS total_count
    FROM regions
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT $${values.length + 1} OFFSET $${values.length + 2};
  `;

  values.push(PAGE_LIMIT, offset);
  const result = await db.query(queryText, values);
  const rows = result.rows;

  if (rows.length === 0) {
    return { total_pages: 0, current_page: page, total_regions: 0, data: [] };
  }

  const totalCount = parseInt(rows[0].total_count, 10);
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);
  const data = rows.map(({ total_count, ...regionData }) => regionData);

  return {
    total_pages: totalPages,
    current_page: page,
    total_regions: totalCount,
    data,
  };
};

const updateRegion = async (id, new_city_code, new_city_name) => {
  const queryText = `
    UPDATE regions
    SET city_code = $1, city_name = $2
    WHERE id = $3
    RETURNING id, city_code, city_name, created_at;
  `;
  const values = [new_city_code, new_city_name, id];
  const result = await db.query(queryText, values);

  if (result.rowCount === 0) {
    throw new AppError('NOT_FOUND', 'Region not found', 404);
  }

  return result.rows[0];
};

const deleteRegion = async (id) => {
  const queryText = `
    DELETE FROM regions
    WHERE id = $1
    RETURNING id, city_code, city_name;
  `;
  const result = await db.query(queryText, [id]);

  if (result.rowCount === 0) {
    throw new AppError('NOT_FOUND', 'Region not found', 404);
  }

  return result.rows[0];
};

module.exports = {
  createRegionTable,
  createRegion,
  findRegions,
  updateRegion,
  deleteRegion,
};
