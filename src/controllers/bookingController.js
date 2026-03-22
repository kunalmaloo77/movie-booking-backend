const crypto = require('crypto');
const {
  createBooking,
  confirmBooking,
  fetchBookingsByUserId,
} = require('../models/bookingModel.js');

const createNewBooking = async (req, res) => {
  const { show_id, seat_ids } = req.body;
  const user_id = req.user.id;

  if (!show_id || !seat_ids || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  try {
    const razorpayInstance = req.app.get('razorpay');
    const result = await createBooking(user_id, show_id, seat_ids, razorpayInstance);

    res.status(201).json({
      message: 'Booking initiated. Complete payment to confirm.',
      bookingId: result.bookingId,
      razorpayOrderId: result.razorpayOrderId,
      amount: result.amount,
      currency: result.currency,
      reservedUntil: result.reservedUntil,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    if (error.statusCode === 409) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

// Public endpoint — secured by Razorpay signature, no JWT needed
const verifyBookingPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields' });
  }

  // Verify Razorpay signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  try {
    const bookingId = await confirmBooking(razorpay_order_id, razorpay_payment_id);
    res.status(200).json({ message: 'Payment verified. Booking confirmed.', bookingId });
  } catch (error) {
    console.error('Error confirming booking:', error);
    if (error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    if (error.statusCode === 410) {
      return res.status(410).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to confirm booking' });
  }
};

// Public endpoint — called by Razorpay servers, secured by webhook signature
const razorpayWebhook = async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody)
    .digest('hex');

  if (expectedSignature !== webhookSignature) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  const { event, payload } = req.body;

  if (event === 'payment.captured') {
    const { order_id, id: payment_id } = payload.payment.entity;
    try {
      await confirmBooking(order_id, payment_id);
    } catch (error) {
      // Already confirmed by client-side verify — idempotent, safe to ignore
      if (error.statusCode !== 410 && error.statusCode !== 404) {
        console.error('Webhook confirmBooking error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
      }
    }
  }

  if (event === 'payment.failed') {
    const { order_id } = payload.payment.entity;
    try {
      await req.app.get('db').query(
        `UPDATE bookings SET status = 'PAYMENT_FAILED' WHERE razorpay_order_id = $1 AND status = 'CREATED'`,
        [order_id]
      );
    } catch (error) {
      console.error('Webhook payment.failed error:', error);
    }
  }

  // Always respond 200 to Razorpay so it doesn't retry
  res.status(200).json({ received: true });
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
  verifyBookingPayment,
  razorpayWebhook,
  getBookingsByUserId,
};
