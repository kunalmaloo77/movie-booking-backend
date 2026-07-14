const crypto = require('crypto');
const {
  createBooking,
  confirmBooking,
  failBooking,
  fetchBookingsByUserId,
} = require('../models/bookingModel.js');
const AppError = require('../utils/AppError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const { findShowSeatIds, findShowById } = require('../models/showsModel.js');

const createNewBooking = async (req, res) => {
  const { show_id, seat_ids } = req.body;
  const user_id = req.user.id;

  if (
    !show_id ||
    !seat_ids ||
    !Array.isArray(seat_ids) ||
    seat_ids.length === 0
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Missing or invalid required fields',
      400
    );
  }

  const show = await findShowById(show_id);
  if (!show) {
    throw new AppError('NOT_FOUND', 'Show not found', 404);
  }
  if (show.status === 'cancelled') {
    throw new AppError('BAD_REQUEST', 'This show has been cancelled', 400);
  }
  if (new Date(show.start_time) <= new Date()) {
    throw new AppError(
      'BAD_REQUEST',
      'Cannot book seats for a show that has already started',
      400
    );
  }

  const razorpayInstance = req.app.get('razorpay');
  try {
    const show_seat_ids = await findShowSeatIds(show_id, seat_ids);
    // Every requested seat must exist for this show — otherwise the user
    // would silently book (and pay for) fewer seats than they selected
    if (show_seat_ids.length !== seat_ids.length) {
      throw new AppError(
        'VALIDATION_ERROR',
        'One or more seats do not exist for this show',
        400
      );
    }
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
    if (err instanceof AppError) {
      throw err;
    }
    console.error('BOOKING ERROR:', err);
    throw new AppError(
      'BOOKING',
      'Something went wrong while creating booking',
      500
    );
  }
};

// Public endpoint — secured by Razorpay signature, no JWT needed
const verifyBookingPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Missing payment verification fields',
      400
    );
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
      if (error.statusCode === 410) {
        // Payment captured but reservation expired — money was taken with no
        // booking to show for it. Needs a refund.
        console.error(
          `REFUND NEEDED: payment ${payment_id} captured for expired order ${order_id}`
        );
      } else if (error.statusCode !== 404) {
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
