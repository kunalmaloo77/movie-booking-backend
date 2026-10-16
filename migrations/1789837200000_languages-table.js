export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('languages', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(50)', unique: true, notNull: true },
        created_at: {
            type: 'timestamp with time zone',
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.sql(`
        INSERT INTO languages (name)
        VALUES ('English'), ('Hindi'), ('Tamil'), ('Telugu'),
               ('Kannada'), ('Malayalam'), ('Marathi')
        ON CONFLICT (name) DO NOTHING;
    `);
};

export const down = (pgm) => {
    pgm.dropTable('languages');
};