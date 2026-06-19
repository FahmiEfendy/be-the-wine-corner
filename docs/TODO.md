# The Wine Corner — Backend TODO

## 🔴 Critical

- [ ] **Input validation & sanitization** — Add request body validation (e.g., `express-validator` or `joi`) to prevent SQL injection and malformed data
- [ ] **Rate limiting** — Add `express-rate-limit` to auth endpoints to prevent brute-force attacks
- [ ] **Helmet.js** — Add `helmet` middleware for production security headers
- [ ] **CORS configuration** — Restrict `cors()` to specific origins instead of allowing all (`*`)
- [ ] **Error handling middleware** — Centralized error handler instead of per-route try/catch
- [ ] **Graceful shutdown** — Handle `SIGTERM`/`SIGINT` to close DB connections and finish pending requests

## 🟡 Medium

- [ ] **API versioning** — Prefix routes with `/v1/` for future backward compatibility
- [ ] **Pagination** — Add pagination to product and category list endpoints
- [ ] **Search & filtering** — Add query parameter support for searching products by name, category, price range
- [ ] **Image optimization** — Resize/compress uploaded images with `sharp` before storing
- [ ] **Soft deletes** — Add `deletedAt` column instead of hard deleting records
- [ ] **Request ID tracing** — Add unique request IDs to logs for debugging
- [ ] **Database migrations** — Replace `init-db.js` with a proper migration tool (e.g., `knex` migrations)
- [ ] **Automated tests** — Add unit tests for routes and integration tests for the API (Jest + Supertest)
- [ ] **CI test pipeline** — Run tests in GitHub Actions before building the Docker image

## 🟢 Nice to Have

- [ ] **API documentation** — Generate OpenAPI/Swagger docs from route definitions
- [ ] **Product analytics** — Track click analytics (WhatsApp, Blibli, Tokopedia) with proper event logging
- [ ] **Caching** — Add Redis caching for frequently read product/category data
- [ ] **File storage migration** — Move image uploads to object storage (S3/MinIO) instead of local filesystem
- [ ] **Audit logging** — Log all write operations (create, update, delete) with user and timestamp
- [ ] **Health check enhancements** — Add uptime, memory usage, and version info to `/health`
- [ ] **Compression** — Enable response compression with `compression` middleware (if not handled by Cloudflare)
