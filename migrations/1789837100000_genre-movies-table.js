export const shorthands = undefined;

export const up = (pgm) => {
    pgm.createTable('genre_movies', {
        id: { type: 'serial', primaryKey: true },
        genre_id: { type: 'integer', notNull: true, references: 'genres', onDelete: 'CASCADE' },
        movie_id: { type: 'integer', notNull: true, references: 'movies', onDelete: 'CASCADE' },
        created_at: {
            type: 'timestamptz',
            default: pgm.func('current_timestamp'),
        },
    });
    pgm.addConstraint('genre_movies', 'genre_movies_genre_id_movie_id_key', {
        unique: ['genre_id', 'movie_id'],
    });
};

export const down = (pgm) => {
    pgm.dropTable('genre_movies');
};