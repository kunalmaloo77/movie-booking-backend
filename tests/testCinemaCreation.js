const { createRegionTable, createRegion } = require('../src/models/regionModel');
const { createCinemaTable, createCinema } = require('../src/models/cinemaModel');
const db = require('../src/config/db');

const testCinemaCreation = async () => {
    try {
        console.log('--- Starting Verification ---');

        // 1. Ensure tables exist
        await createRegionTable();
        await createCinemaTable();

        // 2. Create a dummy region
        const cityCode = 'TEST_CITY_' + Date.now();
        const region = await createRegion(cityCode, 'Test City');
        console.log('Region created:', region);

        // 3. Create a cinema associated with that region
        const cinema = await createCinema('Test Cinema', cityCode);
        console.log('Cinema created:', cinema);

        if (cinema.cinema_code && cinema.region_id === region.id) {
            console.log('--- Verification PASSED ---');
        } else {
            console.error('--- Verification FAILED: Code missing or Region ID mismatch ---');
        }

    } catch (error) {
        console.error('--- Verification ERROR ---', error);
    } finally {
        process.exit();
    }
};

testCinemaCreation();
