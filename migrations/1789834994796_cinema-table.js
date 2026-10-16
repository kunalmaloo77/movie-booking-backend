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
    pgm.createTable('cinemas', {
        id: { type: 'serial', primaryKey: true },
        cinema_name: { type: 'varchar(100)', notNull: true },
        cinema_code: { type: 'varchar(50)', unique: true, notNull: true },
        address: { type: 'text', notNull: true },
        region_id: { type: 'integer', references: 'regions' },
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
export const down = (pgm) => {
    pgm.dropTable('cinemas');
};