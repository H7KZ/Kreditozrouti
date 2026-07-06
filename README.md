<div align="center">
  <img src="client/public/logo/kreditozrouti-transparent-cropped.png" alt="Kreditožrouti Logo" width="200">

# Kreditožrouti

**The course scheduling tool that InSIS should have been**

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

**https://kreditozrouti.cz/docs/en/getting-started**

> The app runs at **[kreditozrouti.cz](https://kreditozrouti.cz)** — no sign-up needed.

---

## Getting Started

For **local development and deployment**, see the engineering docs:

- [**Developer Setup**](docs/dev/engineering/SETUP.md) — prerequisites, env vars, running locally
- [**Contributing**](docs/dev/engineering/CONTRIBUTING.md) — branch strategy, commit conventions, PR process
- [**Deployment**](docs/dev/DEPLOYMENT.md) — Docker Compose stacks, CI/CD, production ops

Full engineering docs are also available at **https://kreditozrouti.cz/docs/dev/**

---

## Documentation

### For users

**https://kreditozrouti.cz/docs/en/**

### For engineers

**https://kreditozrouti.cz/docs/dev/** — architecture, API, client, scraper, deployment, contributing

Source files are in `docs/dev/`:

| Area         | Overview                                                 | Details                                                                                                                                                                                             |
|--------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Engineering  | [docs/dev/ENGINEERING.md](docs/dev/ENGINEERING.md)       | [setup](docs/dev/engineering/SETUP.md) · [contributing](docs/dev/engineering/CONTRIBUTING.md)                                                                                                       |
| Architecture | [docs/dev/ARCHITECTURE.md](docs/dev/ARCHITECTURE.md)     | [monorepo](docs/dev/architecture/MONOREPO.md) · [services](docs/dev/architecture/SERVICES.md) · [data flow](docs/dev/architecture/DATA_FLOW.md) · [containers](docs/dev/architecture/CONTAINERS.md) |
| API          | [docs/dev/api/README.md](docs/dev/api/README.md)         | [endpoints](docs/dev/api/ENDPOINTS.md) · [services](docs/dev/api/SERVICES.md) · [jobs](docs/dev/api/JOBS.md) · [database](docs/dev/api/DATABASE.md)                                                 |
| Client       | [docs/dev/client/README.md](docs/dev/client/README.md)   | [stores](docs/dev/client/STORES.md) · [composables](docs/dev/client/COMPOSABLES.md) · [timetable](docs/dev/client/TIMETABLE.md)                                                                     |
| Scraper      | [docs/dev/scraper/README.md](docs/dev/scraper/README.md) | [jobs](docs/dev/scraper/JOBS.md) · [extraction](docs/dev/scraper/EXTRACTION.md) · [queue](docs/dev/scraper/QUEUE.md)                                                                                |
| Shared       | [docs/dev/shared/README.md](docs/dev/shared/README.md)   | [domain](docs/dev/shared/DOMAIN.md) · [http](docs/dev/shared/HTTP.md) · [queue](docs/dev/shared/QUEUE.md)                                                                                           |
| Deployment   | [docs/dev/DEPLOYMENT.md](docs/dev/DEPLOYMENT.md)         | [docker](docs/dev/deployment/DOCKER.md) · [ci/cd](docs/dev/deployment/CICD.md) · [infrastructure](docs/dev/deployment/INFRASTRUCTURE.md) · [operations](docs/dev/deployment/OPERATIONS.md)          |

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

- [Privacy Policy](https://kreditozrouti.cz/docs/en/legal/privacy)
- [Terms of Use](https://kreditozrouti.cz/docs/en/legal/terms)

Data is scraped from InSIS. Use at your own risk. Respect InSIS rate limits and terms of service.

---

Bugs and feature requests: [GitHub Issues](https://github.com/H7KZ/Kreditozrouti/issues)

---

<div align="center">
  <p>Made with ❤️ for VŠE students · <a href="https://www.vse.cz">VŠE Prague</a> · <a href="https://insis.vse.cz">InSIS</a></p>
</div>
