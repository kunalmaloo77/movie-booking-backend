require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { upsertGenre } = require("../src/models/moviesModel");

async function addGenres() {
  try {
    const url = "https://api.themoviedb.org/3/genre/movie/list?language=en-US";
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
      },
    };

    console.log("Fetching genres from TMDB API...");
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch genres: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.genres && Array.isArray(data.genres)) {
      for (const genre of data.genres) {
        const result = await upsertGenre(genre.id, genre.name);
        console.log(`Saved genre: ${result.name} (ID: ${result.id})`);
      }
      console.log(`Successfully imported ${data.genres.length} genres.`);
    } else {
      console.error("No genres found in response:", data);
    }
  } catch (error) {
    console.error("Error importing genres:", error.message);
  } finally {
    process.exit(0);
  }
}

addGenres();
