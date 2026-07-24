# The Wine Corner — Backend Changelog

All notable changes to the backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-07-24

### Added
- On-the-fly image resizing via `sharp` when `?w=` or `?h=` query parameters are supplied to `/uploads/:filename`
- Resized image cache stored in `image_cache/` directory (outside `uploads/` to prevent static bypass)
- `Cache-Control: public, max-age=31536000, immutable` headers for all optimized image responses
- Dimension cap of 2000 px per axis to prevent abuse
- Centralized error handling middleware (`middleware/errorHandler.js`) — all unhandled errors flow through a single handler with stack trace in dev, clean message in production
- Request validation middleware (`middleware/validation.js`) using `express-validator` for all auth, product, and category routes
- Rate limiting via `express-rate-limit`: 100 req / 15 min globally, 15 req / 15 min on `/auth`
- Security headers via `helmet`
- CORS origin whitelist via `ALLOWED_ORIGINS` environment variable
- Graceful shutdown on `SIGTERM`/`SIGINT` with DB pool drain and 10 s force-exit
- UUID parameter validation (`uuidParamValidator`) on all routes accepting `:id` params
- Click-type whitelist validation (`clickTypeParamValidator`) on the click tracking route
- Product query parameter sanitization (`productQueryValidator`) with `.toInt()` / `.toFloat()` coercions
- `trust proxy` enabled for correct client IP detection behind Nginx

### Changed
- All route handlers now call `next(error)` instead of inline `res.status(500)` for consistent error formatting
- `PUT /products/:id` middleware order fixed — UUID validation now runs before multer body parsing
- Click tracking column name uses a static map instead of a template-literal SQL string
- Auth failure messages unified to `"Invalid credentials"` to prevent user enumeration
- Auth failure log level downgraded from `error` → `warn`
- Health check DB failure now delegates to centralized error handler

### Security
- Image resize endpoint validates `w`/`h` as integers and caps at 2000 px

### Fixed
- `minPrice !== undefined` check (was `minPrice &&`) to correctly handle `minPrice=0`
- `lastPage` calculation now uses sanitized `finalLimit` instead of raw query string `limit`
- Pagination `LIMIT ? OFFSET ?` now uses pre-validated `finalLimit` / `finalOffset` values
- View increment error log message corrected (was copy-pasted from delete route)

---

## [0.1.0] — 2026-06-19

### Added
- Express 5 REST API server on port 5001
- MySQL database integration via `mysql2` with connection pooling
- Auto-initialization of database schema (`users`, `categories`, `products` tables)
- JWT-based authentication (register, login) with bcrypt password hashing
- Products CRUD endpoints with image upload support via Multer
- Categories CRUD endpoints with image support
- Health check endpoint (`/health`) with database connectivity verification
- Winston logger with Morgan HTTP request logging
- CORS middleware enabled
- Production-ready Dockerfile (Node.js 20 Alpine, multi-stage not needed)
- GitHub Actions CI/CD pipeline — builds and pushes to GHCR on `main` branch
- `.dockerignore` to optimize image size
- Postman collection for API testing (`docs/The Wine Corner.postman_collection.json`)
