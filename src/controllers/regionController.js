const { createRegion, findRegionByCityCode } = require('../models/regionModel.js');

const createRegionController = async (req, res) => {
    try {
        const { city_code, city_name } = req.body;
        if (!city_code || !city_name) {
            return res.status(400).json({ message: 'City code and city name are required' });
        }
        const region = await createRegion(city_code, city_name);
        res.status(201).json(region);
    } catch (error) {
        console.error(error);
        if (error.code === "23505") {
            return res.status(400).json({ message: "Region with city code already exists" });
        }
        res.status(500).json({ message: error.message });
    }
}

const findRegionByCityCodeController = async (req, res) => {
    try {
        const { city_code } = req.body;
        if (!city_code) {
            return res.status(400).json({ message: 'City code is required' });
        }
        const region = await findRegionByCityCode(city_code);
        res.status(200).json(region);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createRegionController,
    findRegionByCityCodeController,
};