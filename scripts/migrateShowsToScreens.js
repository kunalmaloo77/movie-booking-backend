/**
 * Migration script: Replace cinema_id with screen_id in shows table
 * Run this if you have an existing database with shows.cinema_id
 *
 * Usage: node scripts/migrateShowsToScreens.js
 */

require("dotenv").config();
const { pool } = require("../src/config/db");
const { createScreensTable } = require("../src/models/screenModel");
const { createScreen } = require("../src/models/screenModel");

const migrate = async () => {
  const client = await pool.connect();

  try {
    // Check if shows has cinema_id (old schema)
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'shows' AND column_name IN ('cinema_id', 'screen_id')
    `);
    const hasCinemaId = colCheck.rows.some((r) => r.column_name === "cinema_id");
    const hasScreenId = colCheck.rows.some((r) => r.column_name === "screen_id");

    if (!hasCinemaId && hasScreenId) {
      console.log("Shows table already uses screen_id. No migration needed.");
      return;
    }

    if (!hasCinemaId) {
      console.log("Shows table not found or has unexpected schema.");
      return;
    }

    console.log("Creating screens table...");
    await createScreensTable();

    // Create default screen for each cinema that has shows
    const cinemasWithShows = await client.query(`
      SELECT DISTINCT cinema_id FROM shows
    `);

    const cinemaToScreen = {};
    for (const row of cinemasWithShows.rows) {
      const screen = await createScreen(row.cinema_id, "Screen 1");
      cinemaToScreen[row.cinema_id] = screen.id;
    }

    // Add screen_id column
    await client.query(`
      ALTER TABLE shows ADD COLUMN IF NOT EXISTS screen_id INT REFERENCES screens(id)
    `);

    // Copy cinema_id -> screen_id
    for (const [cinemaId, screenId] of Object.entries(cinemaToScreen)) {
      await client.query(
        `UPDATE shows SET screen_id = $1 WHERE cinema_id = $2`,
        [screenId, cinemaId]
      );
    }

    // Drop cinema_id and make screen_id NOT NULL
    await client.query(`ALTER TABLE shows ALTER COLUMN screen_id SET NOT NULL`);
    await client.query(`ALTER TABLE shows DROP COLUMN cinema_id`);

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
};

migrate();
