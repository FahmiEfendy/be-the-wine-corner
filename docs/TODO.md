# The Wine Corner — Backend TODO

## 🔴 Critical


## 🟡 Medium

- [ ] **API versioning** — Prefix routes with `/v1/` for future backward compatibility
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
