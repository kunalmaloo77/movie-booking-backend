const {
  createScreen,
  findScreensByCinemaId,
  findScreenById,
} = require('../models/screenModel');

const createScreenController = async (req, res) => {
  const { name, cinema_id, screen_type, total_capacity } = req.body;
  if (!name || !cinema_id || !screen_type || !total_capacity) {
    return res.status(400).json({
      error:
        'Screen name, cinema ID, screen type, and total capacity are required',
    });
  }
  try {
    const newScreen = await createScreen(
      cinema_id,
      name,
      screen_type,
      total_capacity
    );
    res.status(201).json(newScreen);
  } catch (error) {
    console.error('Error creating screen:', error);
    res.status(500).json({ error: 'Failed to create screen' });
  }
};

const getScreensByCinemaId = async (req, res) => {
  try {
    const { cinema_id } = req.params;
    const screens = await findScreensByCinemaId(cinema_id);
    res.status(200).json({ data: screens });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getScreenById = async (req, res) => {
  try {
    const { id } = req.params;
    const screen = await findScreenById(id);
    res.status(200).json(screen);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createScreenController,
  getScreensByCinemaId,
  getScreenById,
};
