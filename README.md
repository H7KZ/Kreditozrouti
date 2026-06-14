<div align="center">
  <img src="client/public/logo/kreditozrouti-transparent-cropped.png" alt="Kreditožrouti Logo" width="200">

# Kreditožrouti

**The course scheduling tool that InSIS should have been**

[![Beta Release](https://img.shields.io/badge/status-beta-blue.svg)](https://github.com/H7KZ/Kreditozrouti)
[![License](https://img.shields.io/badge/license-See%20Compliance-green.svg)](client/src/legal)
[![VŠE](https://img.shields.io/badge/university-VŠE%20Prague-0066b3.svg)](https://www.vse.cz)

Give VŠE students instant, filterable access to every course, timetable slot, and study plan in one modern interface.

</div>

---

## What is this?

**Kreditožrouti** is a course scheduling system for students at Prague University of Economics and Business (VŠE). It
scrapes course data from InSIS — the university's information system — and presents it in a fast, filterable interface
with a live timetable and automatic conflict detection.

Every semester, 16,000+ VŠE students spend hours in InSIS trying to build a schedule. InSIS has no cross-filtering, no
timetable preview, and no conflict detection. Kreditožrouti fixes that.

---

## Features

- **Instant filtering** — search by faculty, time, lecturer, ECTS, language, campus, and more
- **Live timetable grid** — drag-and-drop, real-time conflict detection
- **Study plan wizard** — picks courses you still need based on your curriculum
- **Campus conflict detection** — flags schedules requiring impossible commutes between Žižkov and Jižní Město
- **Multi-language** — Czech and English
- **Persistent** — your schedule is saved in browser localStorage

---

## User Guide

New to Kreditožrouti? The user guide walks you through every feature:

- [Getting Started](docs/user/GETTING_STARTED.md) — wizard setup, first use
- [Features Reference](docs/user/FEATURES.md) — filters, timetable, conflicts, saved schedules

> The app runs at **[kreditozrouti.cz](https://kreditozrouti.cz)** — no sign-up needed.

---

## Getting Started

For **local development and deployment**, see the engineering docs:

- [**Developer Setup**](docs/engineering/SETUP.md) — prerequisites, env vars, running locally
- [**Contributing**](docs/engineering/CONTRIBUTING.md) — branch strategy, commit conventions, PR process
- [**Deployment**](docs/DEPLOYMENT.md) — Docker Compose stacks, CI/CD, production ops

---

## Documentation

### For users

| Area       | Doc                                        |
|------------|--------------------------------------------|
| User Guide | [docs/user/README.md](docs/user/README.md) |

### For engineers

| Area         | Overview                                         | Details                                                                                                                                                                             |
|--------------|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Engineering  | [docs/ENGINEERING.md](docs/ENGINEERING.md)       | [setup](docs/engineering/SETUP.md) · [contributing](docs/engineering/CONTRIBUTING.md)                                                                                               |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | [monorepo](docs/architecture/MONOREPO.md) · [services](docs/architecture/SERVICES.md) · [data flow](docs/architecture/DATA_FLOW.md) · [containers](docs/architecture/CONTAINERS.md) |
| API          | [docs/api/README.md](docs/api/README.md)         | [endpoints](docs/api/ENDPOINTS.md) · [services](docs/api/SERVICES.md) · [jobs](docs/api/JOBS.md) · [database](docs/api/DATABASE.md) · [internals](docs/api/INTERNALS.md)            |
| Client       | [docs/client/README.md](docs/client/README.md)   | [stores](docs/client/STORES.md) · [composables](docs/client/COMPOSABLES.md) · [timetable](docs/client/TIMETABLE.md) · [internals](docs/client/INTERNALS.md)                         |
| Scraper      | [docs/scraper/README.md](docs/scraper/README.md) | [jobs](docs/scraper/JOBS.md) · [extraction](docs/scraper/EXTRACTION.md) · [queue](docs/scraper/QUEUE.md) · [types](docs/scraper/TYPES.md) · [internals](docs/scraper/INTERNALS.md)  |
| Shared       | [docs/shared/README.md](docs/shared/README.md)   | [domain](docs/shared/DOMAIN.md) · [http](docs/shared/HTTP.md) · [queue](docs/shared/QUEUE.md)                                                                                       |
| Deployment   | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)         | [docker](docs/deployment/DOCKER.md) · [ci/cd](docs/deployment/CICD.md) · [infrastructure](docs/deployment/INFRASTRUCTURE.md) · [operations](docs/deployment/OPERATIONS.md)          |
| Scripts      | [docs/SCRIPTS.md](docs/SCRIPTS.md)               | [infrastructure](docs/scripts/INFRASTRUCTURE.md) · [maintenance](docs/scripts/MAINTENANCE.md)                                                                                       |

---

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | Vue 3, Pinia, Tailwind CSS 4, Vite, Vue I18n |
| Backend  | Express 5, Kysely, BullMQ, Zod, TypeScript   |
| Scraper  | Axios, Cheerio, BullMQ                       |
| Database | MySQL 8, Redis                               |
| DevOps   | Docker, GitHub Actions, Traefik              |

---

## Contributing

Contributions are welcome — bug fixes, features, docs, and translations.

See [docs/engineering/CONTRIBUTING.md](docs/engineering/CONTRIBUTING.md) for the full guide.

Short version:

1. Fork → branch off `develop` → PR back to `develop`
2. Use [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
3. Run `make lint && make format` before committing

---

## License & Compliance

This project is provided for educational and personal use. Not officially affiliated with VŠE.

- [Compliance Policy (Czech)](client/src/legal/cs/compliance.md)
- [Compliance Policy (English)](client/src/legal/en/compliance.md)

Data is scraped from InSIS. Use at your own risk. Respect InSIS rate limits and terms of service.

---

## Status

**Beta** — core features implemented and tested. Active development toward a February 2026 launch (registration period).

Bugs and feature requests: [GitHub Issues](https://github.com/H7KZ/Kreditozrouti/issues)

---

<div align="center">
  <p>Made with ❤️ for VŠE students · <a href="https://www.vse.cz">VŠE Prague</a> · <a href="https://insis.vse.cz">InSIS</a></p>
</div>
