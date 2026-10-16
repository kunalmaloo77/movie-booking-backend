export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('show_seats', {
        id: { type: 'serial', primaryKey: true },
        show_id: { type: 'integer', notNull: true, references: 'shows', onDelete: 'CASCADE' },
        seat_id: { type: 'integer', notNull: true, references: 'seats', onDelete: 'CASCADE' },
        status: { type: 'varchar(20)', notNull: true, default: 'available' },
        price: { type: 'decimal(10, 2)', notNull: true },
        reserved_until: { type: 'timestamptz' },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.addConstraint('show_seats', 'show_seats_show_id_seat_id_key', {
        unique: ['show_id', 'seat_id'],
    });
};

export const down = (pgm) => {
    pgm.dropTable('show_seats');
};