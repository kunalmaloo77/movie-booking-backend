/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('genres', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(100)', unique: true, notNull: true },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('current_timestamp'),
        },
    });
};

export const down = (pgm) => {
    pgm.dropTable('genres');
};