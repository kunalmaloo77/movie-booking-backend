require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const { upsertGenre } = require('../src/models/moviesModel');

/**
 * This script fetches movie genres from the TMDB API and saves them to the database.
 * It uses the TMDB API key from the environment variables and the upsertGenre function
 * to insert or update genres in the database. Run this script once to populate the genres table.
 */

async function addGenres() {
  try {
    const url = 'https://api.themoviedb.org/3/genre/movie/list?language=en-US';
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    };

    console.log('Fetching genres from TMDB API...');
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch genres: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.genres && Array.isArray(data.genres)) {
      for (const genre of data.genres) {
        const result = await upsertGenre(genre.id, genre.name);
        console.log(`Saved genre: ${result.name} (ID: ${result.id})`);
      }
      console.log(`Successfully imported ${data.genres.length} genres.`);
    } else {
      console.error('No genres found in response:', data);
    }
  } catch (error) {
    console.error('Error importing genres:', error.message);
  } finally {
    process.exit(0);
  }
}

addGenres()
  .then(() => {
    console.log('Genre import process completed.');
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
