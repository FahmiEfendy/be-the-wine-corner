# The Wine Corner — Backend API

## Overview

Express.js REST API for The Wine Corner, a wine product catalog application. Provides authentication, product management, and category management with MySQL as the data store.

**Container name:** `twc-be`
**Image:** `ghcr.io/fahmiefendy/be-the-wine-corner:latest`
**Port:** `5001`
**Runtime:** Node.js 20 (Alpine)

## Architecture

```
Client → Nginx (infra-nginx) → twc-fe:80 → /api/* proxy → twc-be:5001
                              → api-wine.fahmiefendy.dev  → twc-be:5001 (direct)
                                                            ↓
                                                       db-mysql:3306
```

## Directory Structure

```
be-the-wine-corner/
├── index.js              # Application entry point
├── config/
│   ├── db.js             # MySQL connection pool
│   └── init-db.js        # Auto-creates database & tables on startup
├── routes/
│   ├── auth.js           # Register & login endpoints
│   ├── products.js       # Product CRUD endpoints
│   └── categories.js     # Category CRUD endpoints
├── middleware/            # Express middleware
├── utils/
│   └── logger.js         # Winston logger configuration
├── uploads/              # Product images (volume-mounted, gitignored)
├── docs/                 # Documentation & Postman collection
├── Dockerfile            # Production container image
└── .github/workflows/
    └── deploy.yml        # CI/CD — build & push to GHCR
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server listen port | `5001` | No |
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` | No |
| `DB_HOST` | MySQL server hostname | `localhost` | Yes |
| `DB_USER` | MySQL username | `root` | Yes |
| `DB_PASSWORD` | MySQL password | — | Yes |
| `DB_NAME` | Database name (auto-created if missing) | `the_wine_corner` | Yes |
| `JWT_TOKEN_KEY` | Secret key for signing JWT tokens | — | Yes |
| `JWT_TOKEN_EXPIRED` | JWT token expiry duration | `24h` | No |
| `MORGAN_ENVIRONMENT` | Morgan log format (`dev`, `combined`, `short`) | `dev` | No |

## API Endpoints

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/auth/register` | Register a new user | No |
| `POST` | `/auth/login` | Login and receive JWT | No |

### Products
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/products` | List all products | No |
| `GET` | `/products/:id` | Get product by ID | No |
| `POST` | `/products` | Create a product (with image upload) | Yes |
| `PUT` | `/products/:id` | Update a product | Yes |
| `DELETE` | `/products/:id` | Delete a product | Yes |

### Categories
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/categories` | List all categories | No |
| `GET` | `/categories/:id` | Get category by ID | No |
| `POST` | `/categories` | Create a category | Yes |
| `PUT` | `/categories/:id` | Update a category | Yes |
| `DELETE` | `/categories/:id` | Delete a category | Yes |

### System
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/health` | Health check (includes DB status) | No |
| `GET` | `/` | Welcome message | No |

## Local Development

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start development server (with hot reload)
npm run dev

# Start production server
npm start
```

## Docker Deployment

The container is built and pushed via GitHub Actions on every push to `main`. On the homeserver:

```bash
# Start the app stack
cd /path/to/homeserver/apps/thewinecorner
docker compose up -d

# View logs
docker logs twc-be --tail 50 -f

# Check health
curl http://api-wine.fahmiefendy.dev/health
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` to database | Verify `db-mysql` is running and on the `proxy` network. Check `DB_HOST` in `.env` |
| Database init fails | Ensure the MySQL user has `CREATE DATABASE` privileges |
| JWT errors | Check `JWT_TOKEN_KEY` is set and consistent across restarts |
| Upload failures | Verify `uploads/` directory exists and is writable inside the container |
| 502 from nginx | Check container is running: `docker ps --filter name=twc-be` |
| Health check failing | Check both the app and MySQL connectivity: `docker logs twc-be` |

## Related Files

- [docker-compose.yml](../../docker-compose.yml) — Service definition
- [Dockerfile](../Dockerfile) — Container build
- [deploy.yml](../.github/workflows/deploy.yml) — CI/CD pipeline
- [Postman Collection](./The%20Wine%20Corner.postman_collection.json) — API testing
