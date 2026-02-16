const { createShow } = require("../models/showsModel.js");

const createNewShow = async (req, res) => {
    try {
        const { movie_id, cinema_id, show_date, show_start_time, show_end_time, price } = req.body;
        const show = await createShow(movie_id, cinema_id, show_date, show_start_time, show_end_time, price);
        res.status(201).json(show);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createNewShow };