/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable('movies', {
        id: { type: 'serial', primaryKey: true },
        source: { type: 'varchar(10)', notNull: true, default: 'manual', check: "source IN ('manual', 'tmdb')"},
        title: { type: 'varchar(100)', notNull: true },
        language: { type: 'varchar(100)', notNull: true },
        overview: { type: 'text' },
        tmdb_id: { type: 'integer', unique: true },
        rating: { type: 'decimal(3, 1)', notNull: true },
        adult: { type: 'boolean', notNull: true },
        runtime: { type: 'integer' },
        release_date: { type: 'date', notNull: true },
        poster_image_url: {type: 'varchar(255)', notNull: true},
        backdrop_image_url: {type: 'varchar(255)', notNull: true},
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {};
