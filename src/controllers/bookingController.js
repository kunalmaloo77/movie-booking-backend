const crypto = require('crypto');
const {
  createBooking,
  confirmBooking,
  failBooking,
  fetchBookingsByUserId,
} = require('../models/bookingModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const { findShowSeatIds } = require('../models/showsModel.js');

const createNewBooking = async (req, res) => {
  const { show_id, seat_ids } = req.body;
  const user_id = req.user.id;

  if (
    !show_id ||
    !seat_ids ||
    !Array.isArray(seat_ids) ||
    seat_ids.length === 0
  ) {
    throw new AppError('VALIDATION_ERROR', 'Missing or invalid required fields', 400);
  }

  const razorpayInstance = req.app.get('razorpay');
  try {
    const show_seat_ids = await findShowSeatIds(show_id, seat_ids);
    const result = await createBooking(
      user_id,
      show_id,
      show_seat_ids,
      razorpayInstance
    );

    ApiResponse.success(res, {
      data: {
        bookingId: result.bookingId,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amount,
        currency: result.currency,
        reservedUntil: result.reservedUntil,
      },
      message: 'Booking initiated. Complete payment to confirm.',
      statusCode: 201,
    });
  } catch (err) {
    console.error('BOOKING ERROR:', err);
    throw new AppError('BOOKING', 'Something went wrong while creating booking', 500);
  }
};

// Public endpoint — secured by Razorpay signature, no JWT needed
const verifyBookingPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError('VALIDATION_ERROR', 'Missing payment verification fields', 400);
  }

  // Verify Razorpay signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw new AppError('BAD_REQUEST', 'Invalid payment signature', 400);
  }

  const bookingId = await confirmBooking(
    razorpay_order_id,
    razorpay_payment_id
  );

  ApiResponse.success(res, {
    data: { bookingId },
    message: 'Payment verified. Booking confirmed.',
  });
};

// Public endpoint — called by Razorpay servers, secured by webhook signature
// Must always return 200 to Razorpay to prevent retries
const razorpayWebhook = async (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.rawBody)
    .digest('hex');

  if (expectedSignature !== webhookSignature) {
    return ApiResponse.error(res, {
      code: 'BAD_REQUEST',
      message: 'Invalid webhook signature',
      statusCode: 400,
    });
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
      }
    }
  }

  if (event === 'payment.failed') {
    const { order_id } = payload.payment.entity;
    try {
      await failBooking(order_id);
    } catch (error) {
      console.error('Webhook payment.failed error:', error);
    }
  }

  // Always respond 200 to Razorpay so it doesn't retry
  ApiResponse.success(res, { data: { received: true } });
};

const getBookingsByUserId = async (req, res) => {
  const { user_id } = req.params;

  // Users can only view their own bookings
  if (Number.parseInt(user_id, 10) !== req.user.id) {
    throw new AppError('FORBIDDEN', 'Access denied', 403);
  }

  const bookings = await fetchBookingsByUserId(user_id);
  ApiResponse.success(res, { data: bookings });
};

module.exports = {
  createNewBooking,
  verifyBookingPayment,
  razorpayWebhook,
  getBookingsByUserId,
};
