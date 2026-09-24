<div align="center">
  <img src="web/public/logo/kreditozrouti-transparent-cropped.png" alt="Kreditožrouti Logo" width="200">

# Kreditožrouti

**The course scheduling tool that InSIS should have been**

[![VŠE](https://img.shields.io/badge/university-VŠE%20Prague-0066b3.svg)](https://www.vse.cz)

Explore VŠE courses, timetable slots, and study plans in one filterable interface.

</div>

---

## What is this?

**Kreditožrouti** is a course scheduling system for students at Prague University of Economics and Business (VŠE). It
scrapes course data from InSIS - the university's information system - and presents it in a fast, filterable interface
with a live timetable and automatic conflict detection.

---

## Features

- **Instant filtering** - search by faculty, time, lecturer, ECTS, language, campus, and more
- **Live timetable grid** - drag across empty space to filter courses by time; see conflicts as you build
- **Study plan wizard** - picks courses you still need based on your curriculum
- **Campus conflict detection** - flags schedules requiring impossible commutes between Žižkov and Jižní Město
- **Multi-language** - Czech and English
- **Persistent** - your schedule is saved in browser localStorage

---

## Documentation

- **Students:** use [Kreditožrouti](https://kreditozrouti.cz) without an account. Start with the [English](https://kreditozrouti.cz/docs/en/getting-started) or [Czech](https://kreditozrouti.cz/docs/cs/getting-started) guide.
- **Developers:** start with [local setup](docs/engineering/SETUP.md), [contributing](docs/engineering/CONTRIBUTING.md), or the [developer docs index](docs/README.md).
- **Operators:** use the [deployment guide](docs/deployment/README.md) and [manual setup guides](docs/setup/README.md).

---

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | Vue 3, Pinia, Tailwind CSS 4, Vite, Vue I18n |
| Backend  | Express 5, Kysely, BullMQ, Zod, TypeScript   |
| Scraper  | Axios, Cheerio, BullMQ                       |
| Data | MySQL, Redis                                  |
| DevOps   | Docker, GitHub Actions, Traefik              |

---

## Contributing

Contributions are welcome - bug fixes, features, docs, and translations.

See [docs/engineering/CONTRIBUTING.md](docs/engineering/CONTRIBUTING.md) for the full guide.

Short version:

1. Fork → branch off `develop` → PR back to `develop`
2. Use [conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
3. Run `make lint && make format` before committing

---

## Legal and affiliation

No repository-wide license file is present; `mcp/package.json` declares MIT for that package. This project is not officially affiliated with VŠE.

- [Privacy Policy](https://kreditozrouti.cz/docs/en/legal/privacy)
- [Terms of Use](https://kreditozrouti.cz/docs/en/legal/terms)

Data is scraped from InSIS. Use at your own risk. Respect InSIS rate limits and terms of service.

---

Bugs and feature requests: [GitHub Issues](https://github.com/H7KZ/Kreditozrouti/issues)

---

<div align="center">
  <p>Made with ❤️ for VŠE students · <a href="https://www.vse.cz">VŠE Prague</a> · <a href="https://insis.vse.cz">InSIS</a></p>
</div>
