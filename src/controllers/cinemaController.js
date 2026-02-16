const { createCinema: createCinemaModel, findCinemaByCityCode: findCinemaByCityCodeModel } = require('../models/cinemaModel.js');

const createCinema = async (req, res) => {
    try {
        const { cinema_name, address, city_code } = req.body;
        const cinema = await createCinemaModel(cinema_name, address, city_code);
        res.status(201).json(cinema);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const findCinemaByCityCode = async (req, res) => {
    try {
        const { city_code } = req.body;
        const cinema = await findCinemaByCityCodeModel(city_code);
        res.status(200).json(cinema);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createCinema,
    findCinemaByCityCode,
};