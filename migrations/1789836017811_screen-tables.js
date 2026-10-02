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
    pgm.createTable('screen_types', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(50)', notNull: true },
        description: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamp',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    })
    pgm.createTable('screens', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(100)', notNull: true },
        screen_type: { type: 'integer', references: 'screen_types' , notNull: true },
        cinema_id: { type: 'integer', references: 'cinemas' , notNull: true },
        total_capacity: { type: 'integer', notNull: true },
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
    pgm.dropTable('screens');
    pgm.dropTable('screen_types');
};