# Movie Ticket Booking API

A RESTful backend API for a movie ticket booking system built with Node.js, Express, and PostgreSQL.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt

## Project Structure

```
src/
├── config/
│   └── db.js                # PostgreSQL connection pool
├── controllers/
│   ├── adminController.js   # Admin login
│   ├── authController.js    # User registration & login
│   ├── cinemaController.js  # Cinema CRUD
│   ├── movieController.js   # Movie & genre management
│   ├── regionController.js  # Region/city management
│   └── showsController.js   # Show scheduling
├── middleware/
│   └── authMiddleware.js    # JWT verification & admin authorization
├── models/
│   ├── cinemaModel.js       # Cinemas table & queries
│   ├── moviesModel.js       # Movies, genres & genre_movies tables
│   ├── regionModel.js       # Regions table & queries
│   ├── showsModel.js        # Shows table & queries
│   └── userModel.js         # Users table & queries
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── cinemaRoutes.js
│   ├── movieRoutes.js
│   ├── regionRoutes.js
│   └── showsRoutes.js
└── index.js                 # App entry point
scripts/
└── createAdmin.js           # CLI script to seed an admin user
tests/
├── testCinemaCreation.js
└── verify-auth.js
```

## Database Schema

| Table          | Description                          |
|----------------|--------------------------------------|
| `users`        | User accounts with role-based access |
| `regions`      | Cities/regions identified by code    |
| `cinemas`      | Cinemas linked to a region           |
| `movies`       | Movie details (rating, language, etc)|
| `genres`       | Genre names                          |
| `genre_movies` | Many-to-many link between genres and movies |
| `shows`        | Scheduled showings at a cinema       |

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd movie-ticket-booking
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

### Authentication

| Method | Endpoint              | Description       | Auth     |
|--------|-----------------------|-------------------|----------|
| POST   | `/api/auth/register`  | Register a user   | None     |
| POST   | `/api/auth/login`     | User login        | None     |
| POST   | `/api/admin/login`    | Admin login       | None     |

### Regions (Admin only)

| Method | Endpoint             | Description              | Auth  |
|--------|----------------------|--------------------------|-------|
| POST   | `/api/region/create` | Create a region          | Admin |
| GET    | `/api/region/find`   | Find region by city code | Admin |

### Cinemas

| Method | Endpoint              | Description                | Auth  |
|--------|-----------------------|----------------------------|-------|
| POST   | `/api/cinema/create`  | Create a cinema            | Admin |
| GET    | `/api/cinema/find`    | Find cinemas by city code  | User  |

### Movies

| Method | Endpoint                  | Description              | Auth  |
|--------|---------------------------|--------------------------|-------|
| POST   | `/api/movie/create`       | Create a movie           | Admin |
| POST   | `/api/movie/genre/create` | Create a genre           | Admin |
| GET    | `/api/movie/region/:id`   | Get movies by region ID  | None  |

### Shows

| Method | Endpoint            | Description       | Auth  |
|--------|---------------------|--------------------|-------|
| POST   | `/api/show/create`  | Schedule a show    | Admin |

## Scripts

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm start`          | Start the server                     |
| `npm run dev`        | Start with nodemon (auto-reload)     |
| `npm run create-admin` | Create an admin user via CLI       |
