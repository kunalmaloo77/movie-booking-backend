require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const db = require('../src/config/db');

const RESET = process.argv.includes('--reset');

// ─── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function batchInsert(table, columns, rows, chunkSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders = chunk
      .map((_, ri) =>
        `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(', ')})`
      )
      .join(', ');
    const values = chunk.flat();
    await db.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values
    );
    inserted += chunk.length;
  }
  return inserted;
}

// ─── reset ────────────────────────────────────────────────────────────────────

async function resetTables() {
  console.log('\n⚠️  WARNING: --reset will TRUNCATE and RESEED all mock data tables.');
  console.log('   Proceeding in 3 seconds... (Ctrl+C to abort)\n');
  await sleep(3000);

  // reverse FK order
  await db.query(`
    TRUNCATE TABLE
      booking_seats,
      bookings,
      show_seats,
      shows,
      genre_movies,
      movies,
      genres,
      languages,
      seats,
      screens,
      seat_categories,
      screen_types,
      cinemas,
      users,
      regions
    RESTART IDENTITY CASCADE
  `);
  console.log('✓ All tables truncated.\n');
}

// ─── seed functions ───────────────────────────────────────────────────────────

async function seedRegions() {
  const regions = [
    ['MUM', 'Mumbai'],
    ['DEL', 'Delhi'],
    ['BLR', 'Bangalore'],
  ];
  const map = {};
  for (const [code, name] of regions) {
    const res = await db.query(
      `INSERT INTO regions (city_code, city_name)
       VALUES ($1, $2)
       ON CONFLICT (city_code) DO UPDATE SET city_name = EXCLUDED.city_name
       RETURNING id, city_code`,
      [code, name]
    );
    map[code] = res.rows[0].id;
  }
  console.log(`✓ Regions: ${Object.keys(map).join(', ')}`);
  return map;
}

async function seedCinemas(regionMap) {
  const cinemas = [
    ['PVR Juhu', 'MUM', 'Juhu Beach Road, Mumbai 400049'],
    ['INOX Andheri', 'MUM', 'Versova Road, Andheri West, Mumbai 400053'],
    ['PVR Select Citywalk', 'DEL', 'Select Citywalk Mall, Saket, New Delhi 110017'],
    ['Cinepolis Vasant Kunj', 'DEL', 'DLF Promenade, Vasant Kunj, New Delhi 110070'],
    ['PVR Forum Mall', 'BLR', 'Forum Value Mall, Whitefield, Bangalore 560066'],
    ['INOX Garuda Mall', 'BLR', 'Garuda Mall, Magrath Road, Bangalore 560025'],
  ];
  const map = {};
  for (const [name, regionCode, address] of cinemas) {
    const code = Buffer.from(name).toString('hex').slice(0, 8).toUpperCase();
    const res = await db.query(
      `INSERT INTO cinemas (cinema_name, cinema_code, address, region_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cinema_code) DO UPDATE SET cinema_name = EXCLUDED.cinema_name
       RETURNING id, cinema_name`,
      [name, code, address, regionMap[regionCode]]
    );
    map[name] = res.rows[0].id;
  }
  console.log(`✓ Cinemas: ${Object.keys(map).length}`);
  return map;
}

async function seedScreenTypes() {
  const types = [
    ['2D Standard', 'Standard 2D projection with Dolby audio'],
    ['3D Experience', 'Three-dimensional projection with 3D glasses'],
    ['IMAX', 'Large-format IMAX screen with premium sound'],
  ];
  const map = {};
  for (const [name, desc] of types) {
    const res = await db.query(
      `INSERT INTO screen_types (name, description)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [name, desc]
    );
    if (res.rows.length) {
      map[name] = res.rows[0].id;
    } else {
      const existing = await db.query(`SELECT id FROM screen_types WHERE name = $1`, [name]);
      map[name] = existing.rows[0].id;
    }
  }
  console.log(`✓ Screen types: ${Object.keys(map).join(', ')}`);
  return map;
}

async function seedSeatCategories() {
  const cats = [
    ['Standard', 'Regular seating'],
    ['Premium', 'Enhanced comfort with extra legroom'],
    ['VIP', 'Recliner seats with premium service'],
  ];
  const map = {};
  for (const [name, desc] of cats) {
    const res = await db.query(
      `INSERT INTO seat_categories (name, description)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [name, desc]
    );
    if (res.rows.length) {
      map[name] = res.rows[0].id;
    } else {
      const existing = await db.query(`SELECT id FROM seat_categories WHERE name = $1`, [name]);
      map[name] = existing.rows[0].id;
    }
  }
  console.log(`✓ Seat categories: ${Object.keys(map).join(', ')}`);
  return map;
}

async function seedScreens(cinemaMap, screenTypeMap) {
  const screens = [];
  for (const [cinemaName, cinemaId] of Object.entries(cinemaMap)) {
    screens.push({
      cinema_id: cinemaId,
      name: 'Screen 1',
      screen_type: screenTypeMap['2D Standard'],
      total_capacity: 120,
      cinema_name: cinemaName,
    });
    // alternate 3D / IMAX per cinema
    const is3D = Object.keys(cinemaMap).indexOf(cinemaName) % 2 === 0;
    screens.push({
      cinema_id: cinemaId,
      name: 'Screen 2',
      screen_type: is3D ? screenTypeMap['3D Experience'] : screenTypeMap['IMAX'],
      total_capacity: 80,
      cinema_name: cinemaName,
    });
  }

  const map = {}; // key: `${cinemaId}-${screenName}` → { id, capacity }
  for (const s of screens) {
    const res = await db.query(
      `INSERT INTO screens (cinema_id, name, screen_type, total_capacity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cinema_id, name) DO UPDATE SET total_capacity = EXCLUDED.total_capacity
       RETURNING id, name, total_capacity`,
      [s.cinema_id, s.name, s.screen_type, s.total_capacity]
    );
    const key = `${s.cinema_id}-${s.name}`;
    map[key] = { id: res.rows[0].id, capacity: res.rows[0].total_capacity };
  }
  console.log(`✓ Screens: ${Object.keys(map).length}`);
  return map;
}

function buildSeatRows(screenId, capacity, categoryMap) {
  // 120-seat: rows A-J (10 rows × 12 cols)
  // 80-seat:  rows A-H (8 rows × 10 cols)
  const cols = capacity === 120 ? 12 : 10;
  const rowCount = capacity / cols;
  const rowLabels = 'ABCDEFGHIJ'.slice(0, rowCount).split('');

  // category assignment by row index
  const getCat = (rowIdx) => {
    if (rowIdx <= 2) return categoryMap['Standard'];
    if (rowIdx <= 6) return categoryMap['Premium'];
    return categoryMap['VIP'];
  };

  const rows = [];
  for (let ri = 0; ri < rowLabels.length; ri++) {
    for (let col = 1; col <= cols; col++) {
      rows.push([rowLabels[ri], col, screenId, getCat(ri)]);
    }
  }
  return rows;
}

async function seedSeats(screenMap, categoryMap) {
  let total = 0;
  const seatsByScreen = {}; // screenId → [{id, category_id}]

  for (const [_, screen] of Object.entries(screenMap)) {
    const seatRows = buildSeatRows(screen.id, screen.capacity, categoryMap);
    await batchInsert('seats', ['row_label', 'column_label', 'screen_id', 'category_id'], seatRows);

    // fetch actual seat ids (handles re-runs)
    const res = await db.query(
      `SELECT id, category_id FROM seats WHERE screen_id = $1 ORDER BY row_label, column_label`,
      [screen.id]
    );
    seatsByScreen[screen.id] = res.rows;
    total += res.rows.length;
  }
  console.log(`✓ Seats: ${total} across ${Object.keys(screenMap).length} screens`);
  return seatsByScreen;
}

async function seedGenres() {
  const names = ['Action', 'Drama', 'Sci-Fi', 'Thriller', 'Romance', 'Comedy', 'Crime'];
  const map = {};
  for (const name of names) {
    const res = await db.query(
      `INSERT INTO genres (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [name]
    );
    map[name] = res.rows[0].id;
  }
  console.log(`✓ Genres: ${Object.keys(map).join(', ')}`);
  return map;
}

async function seedLanguages() {
  const names = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi'];
  const map = {};
  for (const name of names) {
    const res = await db.query(
      `INSERT INTO languages (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [name]
    );
    map[name] = res.rows[0].id;
  }
  console.log(`✓ Languages: ${Object.keys(map).join(', ')}`);
  return map;
}

async function seedMovies(genreMap) {
  const now = new Date();
  const daysAgo = (d) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    return dt.toISOString().split('T')[0];
  };

  const movies = [
    {
      title: 'Stellar Horizon',
      rating: 8.1,
      language: 'English',
      adult: false,
      runtime: 148,
      release_date: daysAgo(45),
      poster_image_url: 'https://placehold.co/300x450?text=Stellar+Horizon',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Stellar+Horizon',
      overview: 'An astronaut crew discovers a mysterious signal at the edge of the solar system.',
      genres: ['Sci-Fi', 'Action'],
    },
    {
      title: 'Dil Ki Awaaz',
      rating: 7.4,
      language: 'Hindi',
      adult: false,
      runtime: 135,
      release_date: daysAgo(30),
      poster_image_url: 'https://placehold.co/300x450?text=Dil+Ki+Awaaz',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Dil+Ki+Awaaz',
      overview: 'A musician rediscovers love through the healing power of classical music.',
      genres: ['Drama', 'Romance'],
    },
    {
      title: 'The Last Cipher',
      rating: 7.8,
      language: 'English',
      adult: false,
      runtime: 122,
      release_date: daysAgo(60),
      poster_image_url: 'https://placehold.co/300x450?text=The+Last+Cipher',
      backdrop_image_url: 'https://placehold.co/1280x720?text=The+Last+Cipher',
      overview: 'A cryptographer races to decode a message that could prevent a global catastrophe.',
      genres: ['Thriller'],
    },
    {
      title: 'Prithvi',
      rating: 8.3,
      language: 'Hindi',
      adult: false,
      runtime: 156,
      release_date: daysAgo(20),
      poster_image_url: 'https://placehold.co/300x450?text=Prithvi',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Prithvi',
      overview: 'A soldier returns home to find his village under threat from powerful forces.',
      genres: ['Action', 'Drama'],
    },
    {
      title: 'Neon Streets',
      rating: 7.2,
      language: 'English',
      adult: false,
      runtime: 118,
      release_date: daysAgo(50),
      poster_image_url: 'https://placehold.co/300x450?text=Neon+Streets',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Neon+Streets',
      overview: 'An undercover detective infiltrates a cybercrime syndicate in a neon-lit city.',
      genres: ['Crime', 'Thriller'],
    },
    {
      title: 'Kannadi',
      rating: 8.0,
      language: 'Tamil',
      adult: false,
      runtime: 142,
      release_date: daysAgo(35),
      poster_image_url: 'https://placehold.co/300x450?text=Kannadi',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Kannadi',
      overview: 'A young woman searches for her identity through fragments of a broken mirror.',
      genres: ['Drama'],
    },
    {
      title: "Gravity's Child",
      rating: 7.6,
      language: 'English',
      adult: false,
      runtime: 130,
      release_date: daysAgo(15),
      poster_image_url: 'https://placehold.co/300x450?text=Gravity+Child',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Gravity+Child',
      overview: 'A physicist discovers time bends around grief in this intimate sci-fi drama.',
      genres: ['Sci-Fi', 'Drama'],
    },
    {
      title: 'Rang Barse',
      rating: 7.0,
      language: 'Hindi',
      adult: false,
      runtime: 125,
      release_date: daysAgo(10),
      poster_image_url: 'https://placehold.co/300x450?text=Rang+Barse',
      backdrop_image_url: 'https://placehold.co/1280x720?text=Rang+Barse',
      overview: 'A chaotic Holi festival becomes the backdrop for unexpected romance and family drama.',
      genres: ['Comedy', 'Romance'],
    },
  ];

  const movieList = [];
  for (const m of movies) {
    const res = await db.query(
      `INSERT INTO movies
         (source, title, rating, language, adult, runtime, release_date,
          poster_image_url, backdrop_image_url, overview)
       VALUES ('manual', $1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING
       RETURNING id, title, language`,
      [
        m.title, m.rating, m.language, m.adult, m.runtime,
        m.release_date, m.poster_image_url, m.backdrop_image_url, m.overview,
      ]
    );

    let movieId;
    if (res.rows.length) {
      movieId = res.rows[0].id;
    } else {
      const existing = await db.query(`SELECT id FROM movies WHERE title = $1`, [m.title]);
      movieId = existing.rows[0].id;
    }

    // link genres
    for (const genre of m.genres) {
      await db.query(
        `INSERT INTO genre_movies (genre_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [genreMap[genre], movieId]
      );
    }

    movieList.push({ id: movieId, title: m.title, language: m.language });
  }
  console.log(`✓ Movies: ${movieList.length}`);
  return movieList;
}

async function seedShows(screenMap, movieList, languageMap) {
  const showTimes = ['09:30', '13:00', '16:30', '20:00'];
  const tzOffset = '+05:30'; // IST

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const showList = [];
  const screenIds = Object.values(screenMap).map((s) => s.id);
  let movieIdx = 0;

  for (const screenId of screenIds) {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      const movie = movieList[movieIdx % movieList.length];
      movieIdx++;

      for (const time of showTimes) {
        const startTime = `${dateStr}T${time}:00${tzOffset}`;
        const languageId = languageMap[movie.language] ?? languageMap['English'];
        const res = await db.query(
          `INSERT INTO shows (movie_id, screen_id, start_time, language_id, status)
           VALUES ($1, $2, $3, $4, 'active')
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [movie.id, screenId, startTime, languageId]
        );
        if (res.rows.length) {
          showList.push({ id: res.rows[0].id, screenId, date: dateStr, time });
        }
      }
    }
  }

  // fetch any pre-existing shows to ensure showList is complete on re-runs
  if (showList.length === 0) {
    const res = await db.query(`SELECT id, screen_id AS "screenId" FROM shows WHERE status = 'active'`);
    showList.push(...res.rows);
  }

  console.log(`✓ Shows: ${showList.length}`);
  return showList;
}

const PRICE_BY_CATEGORY = { Standard: 180, Premium: 280, VIP: 450 };

async function seedShowSeats(showList, seatsByScreen) {
  // fetch category id → name map
  const catRes = await db.query(`SELECT id, name FROM seat_categories`);
  const catIdToName = {};
  for (const row of catRes.rows) catIdToName[row.id] = row.name;

  let totalInserted = 0;

  for (const show of showList) {
    const seats = seatsByScreen[show.screenId] || [];
    const rows = seats.map((seat) => {
      const catName = catIdToName[seat.category_id] || 'Standard';
      const price = PRICE_BY_CATEGORY[catName] ?? 180;
      return [show.id, seat.id, 'available', price];
    });
    const inserted = await batchInsert(
      'show_seats',
      ['show_id', 'seat_id', 'status', 'price'],
      rows
    );
    totalInserted += inserted;
  }
  console.log(`✓ Show seats: ${totalInserted} rows`);
}

async function seedUsers(regionMap) {
  const regionIds = Object.values(regionMap);
  const password = await bcrypt.hash('Password@123', 10);

  const firstNames = [
    'Aarav', 'Priya', 'Rohan', 'Sneha', 'Karan',
    'Neha', 'Arjun', 'Pooja', 'Vikram', 'Ananya',
    'Ravi', 'Meera', 'Siddharth', 'Nisha', 'Amit',
    'Kavya', 'Rahul', 'Shruti', 'Akash', 'Divya',
    'Suresh', 'Lakshmi', 'Mohit', 'Isha', 'Tarun',
  ];

  const users = firstNames.map((name, i) => {
    const num = String(i + 1).padStart(2, '0');
    return {
      username: `user${num}`,
      email: `${name.toLowerCase()}${num}@mockcinema.com`,
      password,
      region_id: regionIds[i % regionIds.length],
    };
  });

  const userList = [];
  for (const u of users) {
    const res = await db.query(
      `INSERT INTO users (username, email, password, role, region_id)
       VALUES ($1, $2, $3, 'USER', $4)
       ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
       RETURNING id, username, email`,
      [u.username, u.email, u.password, u.region_id]
    );
    userList.push(res.rows[0]);
  }
  console.log(`✓ Users: ${userList.length} (password: Password@123)`);
  return userList;
}

async function seedBookings(userList, showList) {
  // Only use shows from today or earlier for "completed" bookings
  const todayStr = new Date().toISOString().split('T')[0];
  const pastOrTodayShows = showList.filter((s) => !s.date || s.date <= todayStr);
  const targetShows = pastOrTodayShows.length > 0 ? pastOrTodayShows : showList.slice(0, 20);

  let bookingCount = 0;
  const TARGET = 40;

  // fetch existing show_seats with status available for targeted shows
  const showIds = [...new Set(targetShows.map((s) => s.id))].slice(0, 20);
  if (showIds.length === 0) {
    console.log('✓ Bookings: 0 (no eligible shows)');
    return;
  }

  const availableRes = await db.query(
    `SELECT id, show_id, seat_id FROM show_seats
     WHERE show_id = ANY($1) AND status = 'available'`,
    [showIds]
  );

  // group by show_id
  const seatsByShow = {};
  for (const row of availableRes.rows) {
    if (!seatsByShow[row.show_id]) seatsByShow[row.show_id] = [];
    seatsByShow[row.show_id].push(row);
  }

  const usedShowSeats = new Set();

  for (let i = 0; i < TARGET; i++) {
    const user = userList[i % userList.length];
    const show = targetShows[i % targetShows.length];
    const available = (seatsByShow[show.id] || []).filter((s) => !usedShowSeats.has(s.id));
    if (available.length === 0) continue;

    const seatCount = Math.min(Math.floor(Math.random() * 4) + 1, available.length);
    const chosenSeats = available.slice(0, seatCount);
    chosenSeats.forEach((s) => usedShowSeats.add(s.id));

    const priceRes = await db.query(
      `SELECT SUM(price) AS total FROM show_seats WHERE id = ANY($1)`,
      [chosenSeats.map((s) => s.id)]
    );
    const amount = parseFloat(priceRes.rows[0].total) || 0;

    const mockId = Math.random().toString(36).slice(2, 10).toUpperCase();
    const bookingRes = await db.query(
      `INSERT INTO bookings (user_id, show_id, razorpay_order_id, razorpay_payment_id, status, amount)
       VALUES ($1, $2, $3, $4, 'PAYMENT_SUCCESS', $5)
       ON CONFLICT (razorpay_order_id) DO NOTHING
       RETURNING id`,
      [
        user.id,
        show.id,
        `mock_order_${mockId}`,
        `mock_pay_${mockId}`,
        amount,
      ]
    );

    if (!bookingRes.rows.length) continue;
    const bookingId = bookingRes.rows[0].id;

    for (const seat of chosenSeats) {
      await db.query(
        `INSERT INTO booking_seats (booking_id, show_seats_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [bookingId, seat.id]
      );
      await db.query(
        `UPDATE show_seats SET status = 'booked', reserved_until = NULL WHERE id = $1`,
        [seat.id]
      );
    }
    bookingCount++;
  }

  console.log(`✓ Bookings: ${bookingCount} PAYMENT_SUCCESS bookings created`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  try {
    console.log('=== Movie Booking Mock Data Seed ===\n');

    if (RESET) await resetTables();

    const regionMap = await seedRegions();
    const cinemaMap = await seedCinemas(regionMap);
    const screenTypeMap = await seedScreenTypes();
    const categoryMap = await seedSeatCategories();
    const screenMap = await seedScreens(cinemaMap, screenTypeMap);
    const seatsByScreen = await seedSeats(screenMap, categoryMap);
    const genreMap = await seedGenres();
    const languageMap = await seedLanguages();
    const movieList = await seedMovies(genreMap);
    const showList = await seedShows(screenMap, movieList, languageMap);
    await seedShowSeats(showList, seatsByScreen);
    const userList = await seedUsers(regionMap);
    await seedBookings(userList, showList, seatsByScreen);

    console.log('\n=== Seed complete ===');
    console.log('Login: user01@mockcinema.com / Password@123');
  } catch (err) {
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
