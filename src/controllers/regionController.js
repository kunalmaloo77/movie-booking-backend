const {
  createRegion,
  findAllRegions,
  findRegionByCityName,
} = require('../models/regionModel.js');

const createRegionController = async (req, res) => {
  try {
    const { city_code, city_name } = req.body;
    if (!city_code || !city_name) {
      return res
        .status(400)
        .json({ message: 'City code and city name are required' });
    }
    const region = await createRegion(city_code, city_name);
    res.status(201).json(region);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res
        .status(400)
        .json({ message: 'Region with city code already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

const findRegionByCityNameController = async (req, res) => {
  try {
    const { city_name } = req.params;
    if (!city_name) {
      return res.status(400).json({ message: 'City name is required' });
    }
    const region = await findRegionByCityName(city_name);
    res.status(200).json(region);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const findAllRegionsController = async (req, res) => {
  try {
    const search = req.query.search || null;
    const page = parseInt(req.query.page, 10) || 1;
    const regions = await findAllRegions(search, page);
    res.status(200).json(regions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createRegionController,
  findRegionByCityNameController,
  findAllRegionsController,
};
