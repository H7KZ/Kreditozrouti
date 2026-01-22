# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kreditozrouti is a university course scheduling system that scrapes InSIS (university information system), stores course data, and provides a frontend for students to browse courses and study plans. The system consists of three main services that communicate via BullMQ job queues backed by Redis.

## Development Commands

```bash
# Install all dependencies (requires pnpm 10.20.0+)
make install

# Run all services in parallel (API, Client, Scraper)
make dev

# Run individual services
make dev-api
make dev-client
make dev-scraper

# Code quality
make lint
make format

# Build all projects
make build

# Docker operations
make run-local-docker      # Start MySQL, Redis, phpMyAdmin
make clear-redis           # Flush Redis database
make build-docker-images   # Build production Docker images
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT (Vue 3)           API (Express)       SCRAPER       │
│  Port 45173               Port 40080          (Background)  │
│  ┌─────────────┐         ┌─────────────┐     ┌───────────┐  │
│  │ Vue Router  │  HTTP   │ Controllers │     │ Puppeteer │  │
│  │ Pinia       │ ──────► │ Services    │ ◄───│ Cheerio   │  │
│  │ Tailwind    │         │ Kysely QB   │     │ BullMQ    │  │
│  └─────────────┘         └─────────────┘     └───────────┘  │
│                                │   ▲              │         │
│                                ▼   │              │         │
│                          ┌─────────────┐          │         │
│                          │   MySQL 8   │          │         │
│                          │ Port 43306  │          │         │
│                          └─────────────┘          │         │
│                                                   │         │
│                          ┌─────────────┐          │         │
│                          │    Redis    │ ◄────────┘         │
│                          │ Port 46379  │   (Job Queue)      │
│                          └─────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

**Communication Flow:**
- Client calls API via HTTP/JSON
- API enqueues scraping jobs via BullMQ
- Scraper processes jobs and stores results in MySQL
- Both API and Scraper use Redis for job queue coordination

## Key Tech Stack

| Service  | Framework     | Key Libraries                                    |
|----------|---------------|--------------------------------------------------|
| API      | Express 5     | Kysely, BullMQ, Zod, connect-redis, Nodemailer   |
| Client   | Vue 3 + Vite  | Pinia, Vue Router (auto-routes), Tailwind CSS 4  |
| Scraper  | Node.js       | Puppeteer, Cheerio, BullMQ                       |

## Project Structure

- `/api` - Express backend with Kysely ORM
  - `/src/Controllers/Kreditozrouti` - Business logic (Courses, StudyPlans)
  - `/src/Services` - Domain services (CourseService, StudyPlanService, InSISService)
  - `/src/Database/migrations` - Kysely migrations (numbered 0001-0003+)
  - `/src/Jobs` - BullMQ job handlers for scraper responses
- `/client` - Vue 3 SPA
  - `/src/pages` - File-based routing via unplugin-vue-router
  - `/src/stores` - Pinia stores (alerts, courses, selection, timetable)
  - `/src/locales` - i18n translations (en, cs)
- `/scraper` - Headless browser scraping service
  - `/src/Jobs` - Scraping job implementations
  - `/src/Services` - Scraping business logic

## Path Aliases

All projects use TypeScript path aliases:
- `@api/*` - API source files
- `@client/*` - Client source files
- `@scraper/*` - Scraper source files

Cross-project imports are supported (e.g., client can import API types).

## Database

- **Query Builder:** Kysely (type-safe SQL query builder, not an ORM with migrations auto-sync)
- **Migrations:** Run automatically on API startup
- **Tables:** `insis_faculties`, `insis_courses`, `insis_study_plans`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Run `make run-local-docker` to start MySQL and Redis
3. Run `make install` to install dependencies
4. Run `make dev` to start all services

## API Endpoints

- `POST /courses` - Fetch course data
- `POST /study_plans` - Fetch study plan data
- `GET /health` - Health check
- `/commands/*` - Admin endpoints (protected by API_COMMAND_TOKEN)

## Internationalization

Client supports English (en) and Czech (cs) locales via Vue I18n. Translation files are in `/client/src/locales`.
