require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { batchInsertMovies } = require('../src/models/moviesModel');

const TOTAL_PAGES = 10;
const DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 *
 * @param {*} page
 * @returns Promise<Array>
 *
 * Function to fetch a page of movies from TMDB API.
 */

const fetchPage = async (page) => {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/now_playing?page=${page}`;
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
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      console.log(`Fetching page ${page}/${TOTAL_PAGES}...`);

      const movies = await fetchPage(page);

      if (movies.length === 0) {
        console.log('No more movies found. Stopping.');
        break;
      }

      console.log(`Inserting ${movies.length} movies from page ${page}...`);
      await batchInsertMovies(movies);

      if (page < TOTAL_PAGES) await sleep(DELAY_MS);
    } catch (error) {
      console.error(`Error processing page ${page}:`, error);
      process.exit(1);
    }
  }
};

dumpMovieToMoviesTable()
  .then(() => {
    console.log('Movie dump completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during movie dump:', error);
    process.exit(1);
  });
