require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});
const { batchInsertMovies } = require('../src/models/moviesModel');
const { upsertGenre } = require('../src/models/moviesModel');

const TOTAL_PAGES = 10;
const DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const baseTMDBUrl = 'https://api.themoviedb.org/3'
/**
 * This script fetches movie genres from the TMDB API and saves them to the database.
 * It uses the the upsertGenre function to insert or update genres in the database. 
 * Run this script once to populate the genres table.
 */


async function addGenres() {
  try {
    const url = `${baseTMDBUrl}/genre/movie/list?language=en-US`;
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
      return { count: data.genres.length }
    } else {
      console.error('No genres found in response:', data);
    }
  } catch (error) {
    console.error('Error importing genres:', error.message);
  }
}
/**
 *
 * @param {*} page
 * @returns Promise<Array>
 *
 * Function to fetch a page of movies from TMDB API.
 */

const fetchPage = async (page) => {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `${baseTMDBUrl}/movie/now_playing?page=${page}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return data.results || [];
};

/**
 * Function to fetch movies from TMDB API and insert into movies table.
 */
const dumpMovieToMoviesTable = async () => {
  let totalInserted = 0;
  let totalFailed = 0;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      console.log(`Fetching page ${page}/${TOTAL_PAGES}...`);

      const movies = await fetchPage(page);

      if (movies.length === 0) {
        console.log('No more movies found. Stopping.');
        break;
      }

      console.log(`Inserting ${movies.length} movies from page ${page}...`);
      const result = await batchInsertMovies(movies);
      totalInserted += result?.inserted || 0;
      totalFailed += result?.failed || 0;

      if (page < TOTAL_PAGES) await sleep(DELAY_MS);
    } catch (error) {
      console.error(`Error processing page ${page}:`, error);
    }
  }

  return { totalInserted, totalFailed };
};

async function main() {
  try {
    const genreResult = await addGenres();

    console.log(
      `Genre inserted successfully. Inserted/Updates: ${genreResult.count}`
    );

    const { totalInserted, totalFailed } = await dumpMovieToMoviesTable();

    console.log(
      `Movie dump completed. Inserted/updated: ${totalInserted}, Failed: ${totalFailed}`
    );
  } catch (err) {
    throw new Error("Error inserting movies or genre:", err);
    process.exitCode = 1;
  }
}

main()
