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
    pgm.createTable('users', {
        id: { type: 'serial', primaryKey: true },
        username: { type: 'varchar(100)',  unique: true, notNull: true },
        email: { type: 'varchar(100)', unique: true, notNull: true },
        password: { type: 'varchar(255)', notNull: true },
        role: { type: 'varchar(20)', default: 'USER' },
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
    pgm.dropTable('users');
};
