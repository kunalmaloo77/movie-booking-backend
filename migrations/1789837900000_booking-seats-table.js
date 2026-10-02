export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('booking_seats', {
        booking_id: { type: 'integer', notNull: true, references: 'bookings', onDelete: 'CASCADE' },
        show_seats_id: { type: 'integer', notNull: true, references: 'show_seats' },
    }, {
        constraints: {
            primaryKey: ['booking_id', 'show_seats_id'],
        },
    });
};

export const down = (pgm) => {
    pgm.dropTable('booking_seats');
};