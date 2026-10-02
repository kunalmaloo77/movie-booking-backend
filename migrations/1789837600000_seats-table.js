export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('seats', {
        id: { type: 'serial', primaryKey: true },
        row_label: { type: 'varchar(5)', notNull: true },
        column_label: { type: 'integer', notNull: true },
        screen_id: { type: 'integer', notNull: true, references: 'screens' },
        category_id: { type: 'integer', notNull: true, references: 'seat_categories' },
    });
    pgm.addConstraint('seats', 'seats_row_label_column_label_screen_id_key', {
        unique: ['row_label', 'column_label', 'screen_id'],
    });
};

export const down = (pgm) => {
    pgm.dropTable('seats');
};