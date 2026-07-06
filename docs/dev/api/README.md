# API — Overview

The API is an Express 5 server that serves course and study plan data to the client, orchestrates scraping jobs via
BullMQ, and persists scraped results to MySQL.

## Startup Sequence

The entry point (`src/index.ts`) uses Node.js cluster to manage multiple worker processes. The master process forks N
workers (CLI arg, default 1) and automatically restarts any that die.

Each worker runs `startWorker()`:

```
1. Connect MySQL      → Kysely pool via MYSQL_URI
2. Run migrations     → SQLService.migrateToLatest()
3. Run seeds          → SQLService.seedInitialData()
4. Connect Redis      → ioredis via REDIS_URI
5. Verify email       → Nodemailer SMTP check (if credentials present)
6. Init BullMQ        → bullmq.waitForQueues()
7. Register cron jobs → bullmq.schedulers()  (production only)
8. Start HTTP server  → Express on Config.port (default 40080)
9. SIGTERM/SIGINT     → graceful shutdown
```

## Architecture

```
Client (HTTP)
     │
     ▼
Express App (app.ts)
     │
     ├─ KreditozroutiRoutes  → CoursesController, StudyPlansController, StudyPlanCoursesController
     ├─ ScraperPublicRoutes  → CourseScraperController (trigger + SSE status)
     ├─ CommandsRoutes       → RunInSIS*Controllers (admin Bearer token)
     └─ AdminRoutes
          │
          ▼
     Services (CourseService, StudyPlanService, ScraperService, ...)
          │
          ├─ MySQL (Kysely)
          └─ Redis (ioredis)
               │
               ▼
          BullMQ (ScraperRequestQueue → Scraper process)
          BullMQ (ScraperResponseQueue ← Scraper process)
               │
               ▼
          ScraperResponseHandler → ScraperResponseInSISCourseJob / StudyPlanJob
```

## Directory Structure

```
api/src/
├── index.ts                    # Entry point: cluster management, startWorker()
├── app.ts                      # Express app: middleware, routing, error handling
├── bullmq.ts                   # BullMQ queues, workers, schedulers
├── paths.ts                    # Static path helpers
├── logger.ts                   # Root pino logger + withJobLogger wrapper
├── types.ts                    # Express.Locals augmentation (wideEvent)
│
├── clients/                    # Infrastructure clients
│   ├── mysql.ts                # Kysely instance + slow query logging
│   ├── redis.ts                # ioredis instance + createRedisSubscriber()
│   ├── i18n.ts                 # i18n setup
│   ├── mailer.ts               # Nodemailer transporter
│   └── index.ts                # Re-exports
│
├── Config/Config.ts            # Env loading, config object, validation
│
├── Controllers/                # HTTP handlers (thin: validate → service → respond)
│   ├── Kreditozrouti/          # Public data-read controllers
│   ├── Scraper/                # Scrape-trigger + SSE status
│   └── Commands/               # Admin scrape-trigger controllers
│
├── Services/                   # Business logic
│   ├── CourseService.ts        # Paginated course queries + facets
│   ├── StudyPlanService.ts     # Paginated study plan queries + facets
│   ├── ScraperService.ts       # BullMQ enqueue helpers
│   ├── EmailService.ts         # Email sending
│   ├── InSISService.ts         # Re-exports period helpers from @shared
│   ├── SQLService.ts           # migrateToLatest(), seedInitialData()
│   └── DateService.ts          # getDayFromDate() → InSIS day-of-week enum
│
├── Database/
│   ├── types.ts                # All DB table interfaces + Database interface
│   └── migrations/             # Kysely migration files
│
├── Jobs/                       # BullMQ response job handlers
│   ├── ScraperResponseInSISCourseJob.ts
│   └── ScraperResponseInSISStudyPlanJob.ts
│
├── Handlers/
│   ├── ScraperResponseHandler.ts   # Routes response jobs by type
│   └── ErrorHandler.ts             # Global Express error handler
│
├── Schedulers/                 # Cron scheduler name constants
│   ├── ScraperInSISCatalogRequestScheduler.ts
│   └── ScraperInSISStudyPlansRequestScheduler.ts
│
├── Routes/
│   ├── KreditozroutiRoutes.ts  # Public data-read routes
│   ├── ScraperPublicRoutes.ts  # Scrape-trigger + SSE
│   └── CommandsRoutes.ts       # Protected admin commands
│
├── Middlewares/                # Request/response middleware
├── Errors/index.ts             # ApiError class + Errors factory
├── Validations/index.ts        # Shared Zod primitives
├── Context/                    # Logger contexts
└── utils/
    ├── sse.ts                  # SSE helpers
    └── timeConflict.ts         # Time conflict Kysely conditions
```

## Path Aliases

| Alias       | Resolves to   |
|-------------|---------------|
| `@api/*`    | `./src/*`     |
| `@shared/*` | `../shared/*` |

## Key Conventions

- **Controllers** use named function namespace objects, not classes (see [ENDPOINTS.md](ENDPOINTS.md))
- **Zod schemas** are co-located with their controller
- **Times** are stored as minutes-from-midnight (0–1439) (see [DATABASE.md](DATABASE.md))
