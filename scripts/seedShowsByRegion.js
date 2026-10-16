const db = require('../src/config/db');

const TARGET_REGION_IDS = [
  1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];
const PRIORITY_REGION_IDS = [1, 3, 18];
const DEFAULT_SHOWS_PER_SCREEN = 3;
const DEFAULT_DAYS = 3;
const SHOW_HOURS = [10, 14, 18];
const PRICE_RANGE_BY_CATEGORY = {
  Standard: [120, 220],
  Premium: [220, 360],
  VIP: [360, 550],
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function parseRegionArg(value) {
  return value
    .split(',')
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isInteger(item));
}

function getOrderedRegionIds(regionIds, priorityRegionIds) {
  const uniqueRegions = [...new Set(regionIds)];
  const prioritized = priorityRegionIds.filter((regionId) =>
    uniqueRegions.includes(regionId)
  );
  const remaining = uniqueRegions.filter(
    (regionId) => !prioritized.includes(regionId)
  );

  return [...prioritized, ...remaining];
}

function buildShowStart(dayOffset, hour) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date;
}

async function getLanguageIds() {
  const result = await db.query('SELECT id FROM languages ORDER BY id');
  if (result.rows.length === 0) {
    throw new Error('No languages found. Seed languages before seeding shows.');
  }
  return result.rows.map((row) => row.id);
}

async function getScreensByRegions(regionIds) {
  const result = await db.query(
    `SELECT
        s.id AS screen_id,
        s.name AS screen_name,
        s.cinema_id,
        c.cinema_name,
        c.region_id,
        r.city_name AS region_name
     FROM screens s
     JOIN cinemas c ON c.id = s.cinema_id
     JOIN regions r ON r.id = c.region_id
     WHERE c.region_id = ANY($1::int[])
     ORDER BY c.region_id, c.id, s.id`,
    [regionIds]
  );

  return result.rows;
}

async function getSeatsByScreenIds(screenIds) {
  const result = await db.query(
    `SELECT
        s.id AS seat_id,
        s.screen_id,
        sc.name AS category_name
     FROM seats s
     JOIN seat_categories sc ON sc.id = s.category_id
     WHERE s.screen_id = ANY($1::int[])
     ORDER BY s.screen_id, s.id`,
    [screenIds]
  );

  return result.rows.reduce((accumulator, row) => {
    if (!accumulator[row.screen_id]) {
      accumulator[row.screen_id] = [];
    }

    accumulator[row.screen_id].push(row);
    return accumulator;
  }, {});
}

async function insertShow(movieId, screenId, startTime, languageId) {
  const result = await db.query(
    `INSERT INTO shows (movie_id, screen_id, start_time, language_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [movieId, screenId, startTime, languageId]
  );

  return result.rows[0].id;
}

async function findExistingShow(screenId, startTime) {
  const result = await db.query(
    `SELECT id
     FROM shows
     WHERE screen_id = $1
       AND start_time = $2
       AND status != 'DELETED'
     LIMIT 1`,
    [screenId, startTime]
  );

  return result.rows[0]?.id ?? null;
}

async function findOrCreateShow(movieId, screenId, startTime, languageId) {
  const existingShowId = await findExistingShow(screenId, startTime);
  if (existingShowId) {
    await db.query(
      `UPDATE shows
       SET movie_id = $2,
           language_id = $3
       WHERE id = $1`,
      [existingShowId, movieId, languageId]
    );
    return { id: existingShowId, created: false };
  }

  const createdShowId = await insertShow(movieId, screenId, startTime, languageId);
  return { id: createdShowId, created: true };
}

function getRandomSeatPrice(categoryName) {
  const [minPrice, maxPrice] =
    PRICE_RANGE_BY_CATEGORY[categoryName] || PRICE_RANGE_BY_CATEGORY.Standard;

  return randInt(minPrice, maxPrice);
}

function buildPriceMapForShow(seats) {
  const priceMap = {};

  for (const seat of seats) {
    if (!priceMap[seat.category_name]) {
      priceMap[seat.category_name] = getRandomSeatPrice(seat.category_name);
    }
  }

  return priceMap;
}

async function insertShowSeats(showId, seats) {
  if (!seats || seats.length === 0) {
    return 0;
  }

  const showPriceMap = buildPriceMapForShow(seats);
  const values = [];
  const placeholders = seats.map((seat, index) => {
    const baseIndex = index * 4;
    values.push(
      showId,
      seat.seat_id,
      'available',
      showPriceMap[seat.category_name]
    );

    return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
  });

  const result = await db.query(
    `INSERT INTO show_seats (show_id, seat_id, status, price)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (show_id, seat_id) DO UPDATE
     SET status = EXCLUDED.status,
         price = EXCLUDED.price
     RETURNING id`,
    values
  );

  return result.rows.length;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const regionArg = rawArgs.find((arg) => arg.startsWith('--regions='));
  const priorityArg = rawArgs.find((arg) => arg.startsWith('--priority='));

  const requestedRegionIds = regionArg
    ? parseRegionArg(regionArg.replace('--regions=', ''))
    : rawArgs
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value));

  const configuredPriorityRegionIds = priorityArg
    ? parseRegionArg(priorityArg.replace('--priority=', ''))
    : PRIORITY_REGION_IDS;

  const regionIds =
    requestedRegionIds.length > 0 ? requestedRegionIds : TARGET_REGION_IDS;
  const orderedRegionIds = getOrderedRegionIds(
    regionIds,
    configuredPriorityRegionIds
  );

  console.log(`Seeding shows for region ids: ${orderedRegionIds.join(', ')}`);
  console.log(
    `Priority regions: ${
      configuredPriorityRegionIds.length > 0
        ? configuredPriorityRegionIds.join(', ')
        : 'none'
    }`
  );

  const [languageIds, screens] = await Promise.all([
    getLanguageIds(),
    getScreensByRegions(orderedRegionIds),
  ]);

  if (screens.length === 0) {
    console.log('No screens found for the selected region ids.');
    return;
  }

  const seatsByScreen = await getSeatsByScreenIds(
    screens.map((screen) => screen.screen_id)
  );

  const summary = new Map();
  let insertedCount = 0;
  let reusedCount = 0;
  let pricedSeatCount = 0;

  for (const screen of screens) {
    for (let dayOffset = 0; dayOffset < DEFAULT_DAYS; dayOffset += 1) {
      for (
        let showIndex = 0;
        showIndex < DEFAULT_SHOWS_PER_SCREEN;
        showIndex += 1
      ) {
        const movieId = randInt(1, 200);
        const languageId = pickRandom(languageIds);
        const startTime = buildShowStart(
          dayOffset,
          SHOW_HOURS[showIndex % SHOW_HOURS.length]
        );

        const show = await findOrCreateShow(
          movieId,
          screen.screen_id,
          startTime,
          languageId
        );
        if (show.created) {
          insertedCount += 1;
        } else {
          reusedCount += 1;
        }
        pricedSeatCount += await insertShowSeats(
          show.id,
          seatsByScreen[screen.screen_id]
        );

        const current = summary.get(screen.region_id) || {
          region_name: screen.region_name,
          screens: new Set(),
          shows: 0,
        };

        current.screens.add(screen.screen_id);
        current.shows += 1;
        summary.set(screen.region_id, current);
      }
    }
  }

  console.log(`Inserted ${insertedCount} shows.`);
  console.log(`Reused ${reusedCount} existing shows.`);
  console.log(`Updated ${pricedSeatCount} show seat prices.`);
  for (const [regionId, data] of summary.entries()) {
    console.log(
      `Region ${regionId} (${data.region_name}): ${data.shows} shows across ${data.screens.size} screens`
    );
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed shows by region:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.pool.end();
  });
