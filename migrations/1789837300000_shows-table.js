export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('shows', {
        id: { type: 'serial', primaryKey: true },
        movie_id: { type: 'integer', notNull: true, references: 'movies' },
        screen_id: { type: 'integer', notNull: true, references: 'screens' },
        start_time: { type: 'timestamp with time zone', notNull: true },
        language_id: { type: 'integer', notNull: true, references: 'languages' },
        status: { type: 'varchar(20)', notNull: true, default: 'ACTIVE' },
        created_at: {
            type: 'timestamp',
            default: pgm.func('current_timestamp'),
        },
    });
};

export const down = (pgm) => {
    pgm.dropTable('shows');
};