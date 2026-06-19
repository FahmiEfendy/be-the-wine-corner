# The Wine Corner — Backend Changelog

All notable changes to the backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2026-06-19

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
