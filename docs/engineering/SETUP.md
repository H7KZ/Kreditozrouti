# Local Development Setup

## Prerequisites

| Tool                    | Version       | Notes                                             |
|-------------------------|---------------|---------------------------------------------------|
| Node.js                 | 22.x+         | Use nvm or fnm for version management             |
| Docker + Docker Compose | Latest stable | Required for MySQL, Redis, phpMyAdmin             |
| Make                    | Any           | Optional — convenience wrapper around npm scripts |

---

## First-Time Setup

### 1. Clone

```bash
git clone https://github.com/H7KZ/Kreditozrouti.git
cd Kreditozrouti
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env` with your local values. Minimum required:

```env
# API
API_PORT=40080
API_HOST=0.0.0.0
API_SESSION_SECRET=any-random-string-for-dev
API_COMMAND_TOKEN=any-token-for-dev

# Database
MYSQL_HOST=localhost
MYSQL_PORT=43306
MYSQL_DATABASE=kreditozrouti
MYSQL_USER=kreditozrouti
MYSQL_PASSWORD=kreditozrouti
MYSQL_ROOT_PASSWORD=root

# Redis
REDIS_HOST=localhost
REDIS_PORT=46379

# Client (Vite)
VITE_API_URL=http://localhost:40080
VITE_CLIENT_PORT=45173

NODE_ENV=development
```

> `VITE_*` vars are baked into the client bundle at build time by Vite. Changing them after `npm run build` has no
> effect — you must rebuild.

### 3. Start infrastructure

```bash
make run-local-docker
# Starts: MySQL on :43306, Redis on :46379, phpMyAdmin on :48080
```

Wait ~10 seconds for MySQL to initialize on first run.

### 4. Install dependencies

```bash
make install
# Equivalent to: npm install (installs all workspace packages)
```

### 5. Run the app

```bash
make dev
# Runs api + client + scraper in parallel via concurrently
```

Or individually:

```bash
make dev-api      # Express on :40080
make dev-client   # Vite on :45173
make dev-scraper  # BullMQ worker (no port)
```

### 6. Access

| Service    | URL                                            |
|------------|------------------------------------------------|
| Client     | http://localhost:45173                         |
| API        | http://localhost:40080                         |
| phpMyAdmin | http://localhost:48080 (user: `kreditozrouti`) |

---

## Database Migrations

Migrations run automatically when the API starts in development. To run manually:

```bash
make migrate
```

Migration files live in `api/src/Database/migrations/`. See [docs/api/DATABASE.md](../api/DATABASE.md) for the schema
and migration template.

---

## Triggering Scrapes in Development

Schedulers only run in `NODE_ENV=production`. In development, trigger scrapes manually:

```bash
# Trigger a catalog scrape (enqueues course jobs for a whole faculty)
curl -X POST http://localhost:40080/commands/insis/catalog \
  -H "Authorization: Bearer <API_COMMAND_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"faculty_id": "FIS", "year": 2025, "semester": "ZS"}'

# Trigger a single course scrape
curl -X POST http://localhost:40080/commands/insis/course \
  -H "Authorization: Bearer <API_COMMAND_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"ident": "4IT101", "year": 2025, "semester": "ZS"}'
```

See [docs/api/ENDPOINTS.md](../api/ENDPOINTS.md) for all command endpoints.

---

## All Make Commands

```bash
# Dependencies
make install              # Install all workspace packages

# Development
make dev                  # Run api + client + scraper in parallel
make dev-api              # Run API only
make dev-client           # Run Client only
make dev-scraper          # Run Scraper only

# Code quality
make lint                 # Lint all packages
make format               # Format all packages

# Build
make build                # Production build for all packages
make build-docker-images  # Build Docker images (api, client, scraper)

# Infrastructure
make run-local-docker     # Start MySQL, Redis, phpMyAdmin
make stop-local-docker    # Stop local Docker containers
make clear-redis          # Flush Redis (clears all queues + sessions)

# Database
make migrate              # Run pending DB migrations
```

---

## Common Issues

**MySQL connection refused on first run**
Wait ~15 seconds for MySQL to initialize. `make run-local-docker` then `make dev`.

**Port conflicts**
Non-standard ports are used deliberately to avoid clashing with typical dev setups:

- MySQL: 43306 (not 3306)
- Redis: 46379 (not 6379)
- Client: 45173 (not 5173)
- API: 40080 (not 3000/8080)

**Scraper not processing jobs**
The scraper must be running (`make dev-scraper`). Check Redis is up. Use phpMyAdmin or BullMQ dashboard to inspect
queues.

**`VITE_*` env vars not picking up**
Restart the Vite dev server after changing `.env`. In production, they are baked at build time —
see [docs/deployment/DOCKER.md](../deployment/DOCKER.md) for the placeholder-swap pattern.
