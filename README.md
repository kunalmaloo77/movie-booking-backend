# Movie Ticket Booking API

A RESTful backend API for a movie ticket booking system built with Node.js, Express, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **Payments:** Razorpay

## Project Structure

```
src/
├── config/
│   └── db.js                    # PostgreSQL connection pool
├── controllers/
│   ├── adminController.js        # Admin login
│   ├── authController.js         # User registration & login
│   ├── bookingController.js      # Booking & payment management
│   ├── cinemaController.js       # Cinema CRUD
│   ├── movieController.js        # Movie & genre management
│   ├── regionController.js       # Region/city management
│   ├── screenController.js       # Screen & screen type management
│   ├── seatsController.js        # Seat & seat category management
│   └── showsController.js        # Show scheduling
├── middleware/
│   ├── authMiddleware.js         # JWT verification & admin authorization
│   └── errorHandler.js          # Centralized error handler
├── models/
│   ├── bookingModel.js           # Bookings & booking_seats tables
│   ├── cinemaModel.js            # Cinemas table & queries
│   ├── moviesModel.js            # Movies, genres & genre_movies tables
│   ├── regionModel.js            # Regions table & queries
│   ├── screenModel.js            # Screens & screen_types tables
│   ├── seatModel.js              # Seats & seat_categories tables
│   ├── showsModel.js             # Shows & show_seats tables
│   └── userModel.js              # Users table & queries
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── bookingRoutes.js
│   ├── cinemaRoutes.js
│   ├── movieRoutes.js
│   ├── regionRoutes.js
│   ├── screenRoutes.js
│   ├── seatRoutes.js
│   └── showRoutes.js
├── utils/
│   ├── ApiResponse.js            # Standardized success/error response helper
│   ├── AppError.js               # Operational error class
│   ├── screenService.js          # Screen business logic
│   └── seatService.js            # Seat business logic
└── index.js                      # App entry point
scripts/
├── addGenreTMDB.js               # CLI script to seed genres from TMDB (one-time)
├── createAdmin.js                # CLI script to seed an admin user
├── migrateShowsToScreens.js      # Migration script for shows → screens
└── movieDump.js                  # CLI script to dump movies from TMDB
```

## Database Schema

| Table             | Description                                       |
| ----------------- | ------------------------------------------------- |
| `users`           | User accounts with role-based access              |
| `regions`         | Cities/regions identified by code                 |
| `cinemas`         | Cinemas linked to a region                        |
| `screen_types`    | Screen format types (e.g. 2D, 3D, IMAX)           |
| `screens`         | Screens within a cinema, linked to a screen type  |
| `seat_categories` | Seat tier definitions (e.g. Gold, Silver)         |
| `seats`           | Individual seats linked to a screen and category  |
| `movies`          | Movie details (rating, language, runtime, etc.)   |
| `genres`          | Genre names                                       |
| `genre_movies`    | Many-to-many link between genres and movies       |
| `shows`           | Scheduled showings linked to a screen             |
| `show_seats`      | Per-show seat availability, pricing, and status   |
| `bookings`        | Booking records with Razorpay order details       |
| `booking_seats`   | Many-to-many link between bookings and show seats |

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/kunalmaloo77/movie-booking-backend
   cd movie-ticket-booking/server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```env
   PORT=3000
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=movie_booking_db
   JWT_SECRET=your_jwt_secret_key_here
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   RESERVATION_MINUTES=10
   ```

4. Create the PostgreSQL database:

   ```bash
   createdb movie_booking_db
   ```

5. Start the server (tables are created automatically on startup):
   ```bash
   npm run dev
   ```

### Create an Admin User

```bash
node scripts/createAdmin.js [username] [email] [password]
```

Defaults to `admin` / `admin@example.com` / `admin123` if no arguments are provided.

## API Endpoints

All responses follow a standard envelope format:

```json
{ "success": true, "data": { ... }, "message": null }
{ "success": false, "error": { "code": "...", "message": "...", "details": null } }
```

### Authentication

| Method | Endpoint             | Description     | Auth |
| ------ | -------------------- | --------------- | ---- |
| POST   | `/api/auth/register` | Register a user | None |
| POST   | `/api/auth/login`    | User login      | None |
| POST   | `/api/admin/login`   | Admin login     | None |

### Regions

| Method | Endpoint       | Description     | Auth  |
| ------ | -------------- | --------------- | ----- |
| POST   | `/api/region/` | Create a region | Admin |
| GET    | `/api/region/` | Get all regions | None  |

### Cinemas

| Method | Endpoint       | Description     | Auth  |
| ------ | -------------- | --------------- | ----- |
| POST   | `/api/cinema/` | Create a cinema | Admin |
| GET    | `/api/cinema/` | Search cinemas  | None  |

### Movies

| Method | Endpoint                | Description             | Auth  |
| ------ | ----------------------- | ----------------------- | ----- |
| POST   | `/api/movie/`           | Create a movie          | Admin |
| POST   | `/api/movie/genre/`     | Create a genre          | Admin |
| GET    | `/api/movie/`           | Get all movies          | None  |
| GET    | `/api/movie/genres`     | Get all genres          | None  |
| GET    | `/api/movie/region/:id` | Get movies by region ID | None  |
| GET    | `/api/movie/:id`        | Get movie by ID         | None  |

### Shows

| Method | Endpoint                      | Description                      | Auth  |
| ------ | ----------------------------- | -------------------------------- | ----- |
| POST   | `/api/show/`                  | Schedule a show                  | Admin |
| GET    | `/api/show/screen/:screen_id` | Get shows by screen ID           | None  |
| GET    | `/api/show/movie/:movie_id`   | Get shows by movie ID            | None  |
| GET    | `/api/show/:show_id/seats`    | Get seat availability for a show | None  |

### Screens (Admin)

| Method | Endpoint                                 | Description                    | Auth  |
| ------ | ---------------------------------------- | ------------------------------ | ----- |
| POST   | `/api/screen/`                           | Create a screen                | Admin |
| POST   | `/api/screen/screen-type`                | Create a screen type           | Admin |
| PATCH  | `/api/screen/:screen_id`                 | Update a screen                | Admin |
| GET    | `/api/screen/screen-types`               | Get all screen types           | Admin |
| GET    | `/api/screen/:screen_id/seat-categories` | Get seat categories for screen | Admin |
| GET    | `/api/screen/cinema/:cinema_id`          | Get screens by cinema ID       | None  |
| GET    | `/api/screen/:id`                        | Get screen by ID               | None  |
| DELETE | `/api/screen/:id`                        | Delete a screen                | Admin |

### Seats

| Method | Endpoint                           | Description                      | Auth  |
| ------ | ---------------------------------- | -------------------------------- | ----- |
| POST   | `/api/seats/`                      | Create a seat                    | Admin |
| POST   | `/api/seats/categories`            | Create a seat category           | Admin |
| GET    | `/api/seats/categories`            | Get all seat categories          | None  |
| GET    | `/api/seats/categories/:screen_id` | Get seat categories for a screen | None  |
| GET    | `/api/seats/screen/:screen_id`     | Get seats by screen ID           | None  |

### Bookings

| Method | Endpoint                     | Description                         | Auth   |
| ------ | ---------------------------- | ----------------------------------- | ------ |
| POST   | `/api/booking/`              | Create a booking and Razorpay order | User   |
| POST   | `/api/booking/verify`        | Verify payment after checkout       | None\* |
| POST   | `/api/booking/webhook`       | Razorpay webhook for payment events | None\* |
| GET    | `/api/booking/user/:user_id` | Get bookings for a user             | User   |

\* Secured by Razorpay signature verification instead of JWT.

#### Booking lifecycle

1. `POST /api/booking/` — reserves seats and creates a Razorpay order (`CREATED`).
2. On successful payment, call `POST /api/booking/verify` → status moves to `PAYMENT_SUCCESS` and seats become `booked`.
3. On failure, the webhook or verify endpoint moves status to `PAYMENT_FAILED` and releases seats.
4. A background job runs every 60 seconds and expires `CREATED` bookings older than `RESERVATION_MINUTES` (default 10), releasing their seats back to `available`.

## Scripts

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `npm start`            | Start the server                          |
| `npm run dev`          | Start with nodemon (auto-reload)          |
| `npm run create-admin` | Create an admin user via CLI              |
| `npm run migrate`      | Run database migrations (node-pg-migrate) |
