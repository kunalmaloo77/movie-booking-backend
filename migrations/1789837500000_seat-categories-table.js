export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('seat_categories', {
        id: { type: 'serial', primaryKey: true },
        name: { type: 'varchar(50)', notNull: true },
        description: { type: 'varchar(255)', notNull: true },
    });
};

export const down = (pgm) => {
    pgm.dropTable('seat_categories');
};