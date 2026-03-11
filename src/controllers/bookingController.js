const {
  createBooking,
  fetchBookingsByUserId,
} = require('../models/bookingModel.js');

const createNewBooking = async (req, res) => {
  const { user_id, show_id, seat_ids } = req.body;
  if (!user_id || !show_id || !seat_ids || !Array.isArray(seat_ids)) {
    return res
      .status(400)
      .json({ error: 'Missing or invalid required fields' });
  }
  try {
    const bookingId = await createBooking(user_id, show_id, seat_ids);
    res
      .status(201)
      .json({ message: 'Booking created successfully', bookingId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

const getBookingsByUserId = async (req, res) => {
  const { user_id } = req.params;
  try {
    const bookings = await fetchBookingsByUserId(user_id);
    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

module.exports = {
  createNewBooking,
  getBookingsByUserId,
};
