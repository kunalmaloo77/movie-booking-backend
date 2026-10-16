export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('bookings', {
        id: { type: 'serial', primaryKey: true },
        user_id: { type: 'integer', notNull: true, references: 'users' },
        show_id: { type: 'integer', notNull: true, references: 'shows' },
        razorpay_order_id: { type: 'varchar(255)', unique: true },
        razorpay_payment_id: { type: 'varchar(255)' },
        status: { type: 'varchar(30)', notNull: true, default: 'CREATED' },
        amount: { type: 'decimal(10, 2)', notNull: true, default: 0 },
        created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') },
    });
};

export const down = (pgm) => {
    pgm.dropTable('bookings');
};