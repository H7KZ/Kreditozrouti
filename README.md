<div align="center">
  <img src="client/public/logo/kreditozrouti-transparent-cropped.png" alt="Kreditožrouti Logo" width="200">

  # Kreditožrouti

  **The course scheduling tool that InSIS should have been**

  [![Beta Release](https://img.shields.io/badge/status-beta-blue.svg)](https://github.com/H7KZ/Kreditozrouti)
  [![License](https://img.shields.io/badge/license-See%20Compliance-green.svg)](docs/compliance/)
  [![VŠE](https://img.shields.io/badge/university-VŠE%20Prague-0066b3.svg)](https://www.vse.cz)

  Give VŠE students instant, filterable access to every course, timetable slot, and study plan in one modern interface.

  [Features](#-features) • [Getting Started](#-getting-started) • [Documentation](#-documentation) • [Contributing](#-contributing) • [Deployment](#-deployment)
</div>

---

## 📖 About

**Kreditožrouti** is a modern course scheduling system designed for students at Prague University of Economics and Business (VŠE). It scrapes course data from InSIS (the university's information system) and presents it in a clean, filterable, and user-friendly interface.

### The Problem

Every semester, 16,000+ VŠE students face the same challenge navigating InSIS to find and register for courses:

- ❌ **No cross-filtering** – You cannot search by day, time, lecturer, and faculty simultaneously
- ❌ **No timetable preview** – Students juggle spreadsheets and screenshots to check for conflicts
- ❌ **No study-plan awareness** – Manual cross-referencing of compulsory, optional, and elective courses
- ❌ **No conflict detection** – Overlapping courses discovered only after manual schedule building

**Result:** Hours of wasted time, missed optimal schedules, and frustrated students every registration period.

### The Solution

Kreditožrouti provides:

- ✅ **Instant filtering** – Search by faculty, time, lecturer, ECTS, language, and more
- ✅ **Live timetable preview** – Drag-and-drop interface with real-time conflict detection
- ✅ **Smart recommendations** – Study plan-aware course suggestions
- ✅ **Conflict detection** – Automatic detection of schedule overlaps
- ✅ **Mobile-friendly** – Responsive design works on all devices
- ✅ **Multi-language** – Full Czech and English support

---

## ✨ Features

### 🎯 Core Features

- **Study Plan Wizard** – 3-step guided setup (Faculty → Year → Study Plan)
- **Advanced Filtering** – Filter by 10+ criteria with real-time facets
- **Dual View Mode** – Switch between list view and timetable grid
- **Drag-to-Filter** – Select time ranges directly on the timetable
- **Conflict Detection** – Automatic detection of overlapping courses
- **Completeness Checking** – Validates all required course components are selected
- **Persistent Storage** – Your schedule is saved in browser localStorage
- **Course Details** – Full syllabus, assessments, and lecturer information

### 🛠️ Technical Features

- **Real-time Data** – Scrapes InSIS on-demand and via scheduled jobs
- **Job Queue System** – BullMQ-based async processing
- **Type-Safe** – Full TypeScript coverage across all services
- **Modern Stack** – Vue 3, Express 5, Puppeteer
- **Containerized** – Docker support for easy deployment
- **Database Migrations** – Kysely-based schema management

---

## 🏗️ Architecture

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

### Data Flow

1. **Client** sends course search requests to API via HTTP
2. **API** enqueues scraping jobs to BullMQ (ScraperRequestQueue)
3. **Scraper** processes jobs, scrapes InSIS, and enqueues results (ScraperResponseQueue)
4. **API workers** process responses and persist data to MySQL
5. **Client** queries API for processed course/study plan data

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 22.x or higher
- **pnpm** 10.20.0 or higher
- **Docker & Docker Compose** (for local development)
- **Make** (optional, for convenience commands)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/H7KZ/Kreditozrouti.git
   cd Kreditozrouti
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start infrastructure (MySQL, Redis, phpMyAdmin)**

   ```bash
   make run-local-docker
   # or: docker compose -f docker-compose.local.yml up -d
   ```

4. **Install dependencies**

   ```bash
   make install
   # or: pnpm install
   ```

5. **Run all services in development mode**

   ```bash
   make dev
   # or run individually:
   # make dev-api
   # make dev-client
   # make dev-scraper
   ```

6. **Access the application**

   - **Client:** http://localhost:45173
   - **API:** http://localhost:40080
   - **phpMyAdmin:** http://localhost:48080

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
API_PORT=40080
API_HOST=0.0.0.0
API_SESSION_SECRET=your-secret-key-here
API_COMMAND_TOKEN=your-command-token-here

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

# Client
VITE_API_URL=http://localhost:40080
VITE_CLIENT_PORT=45173

# Environment
NODE_ENV=development
```

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|----------|-------------|
| [**API.md**](docs/API.md) | API architecture, endpoints, services, and job queues |
| [**CLIENT.md**](docs/CLIENT.md) | Client architecture, components, stores, and composables |
| [**SCRAPER.md**](docs/SCRAPER.md) | Scraper implementation, jobs, and InSIS interaction |
| [**SCRIPTS.md**](docs/SCRIPTS.md) | Utility scripts and automation tools |
| [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) | Production deployment guide and configuration |
| [**CLAUDE.md**](CLAUDE.md) | Project overview and development commands |

### Quick Links

- **Setup Guide:** [Getting Started](#-getting-started)
- **API Reference:** [docs/API.md](docs/API.md)
- **Client Guide:** [docs/CLIENT.md](docs/CLIENT.md)
- **Deployment:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Contributing:** [CONTRIBUTING.md](#-contributing)

---

## 🛠️ Development

### Available Commands

```bash
# Installation
make install              # Install all dependencies

# Development
make dev                  # Run all services in parallel
make dev-api              # Run API only
make dev-client           # Run Client only
make dev-scraper          # Run Scraper only

# Code Quality
make lint                 # Lint all projects
make format               # Format all projects

# Build
make build                # Build all projects for production

# Docker
make run-local-docker     # Start MySQL, Redis, phpMyAdmin
make stop-local-docker    # Stop local Docker services
make clear-redis          # Flush Redis database
make build-docker-images  # Build production Docker images

# Database
make migrate              # Run database migrations
make seed                 # Seed database with sample data
```

### Project Structure

```
Kreditozrouti/
├── api/                    # Express API server
│   ├── src/
│   │   ├── Controllers/    # HTTP request handlers
│   │   ├── Services/       # Business logic
│   │   ├── Database/       # Kysely migrations
│   │   ├── Jobs/           # BullMQ response jobs
│   │   └── Handlers/       # Job routing logic
│   └── bruno/              # API testing (Bruno)
│
├── client/                 # Vue 3 SPA
│   ├── src/
│   │   ├── pages/          # File-based routes
│   │   ├── components/     # Vue components
│   │   ├── stores/         # Pinia stores
│   │   ├── composables/    # Composition utilities
│   │   ├── locales/        # i18n translations
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
│
├── scraper/                # Puppeteer scraper
│   └── src/
│       ├── Jobs/           # Scraping job implementations
│       └── Services/       # Scraping business logic
│
├── docs/                   # Documentation
│   ├── API.md
│   ├── CLIENT.md
│   ├── SCRAPER.md
│   ├── SCRIPTS.md
│   ├── DEPLOYMENT.md
│   └── compliance/         # Legal documents
│
├── docker-compose.local.yml    # Local development
├── docker-compose.yml          # Production deployment
├── Makefile                    # Convenience commands
└── README.md                   # This file
```

### Tech Stack

#### Frontend (Client)
- **Vue 3** – Progressive JavaScript framework
- **Pinia** – State management
- **Vue Router 4** – File-based routing
- **Tailwind CSS 4** – Utility-first CSS
- **TypeScript** – Type safety
- **Vite** – Build tool
- **Vue I18n** – Internationalization

#### Backend (API)
- **Express 5** – Web framework
- **Kysely** – Type-safe SQL query builder
- **BullMQ** – Redis-based job queue
- **Zod** – Schema validation
- **MySQL 8** – Relational database
- **Redis** – Cache & job queue
- **TypeScript** – Type safety

#### Scraper
- **Puppeteer** – Headless browser automation
- **Cheerio** – HTML parsing
- **BullMQ** – Job processing

#### DevOps
- **Docker** – Containerization
- **Docker Compose** – Multi-container orchestration
- **pnpm** – Package manager
- **ESLint** – Linting
- **Prettier** – Code formatting

---

## 🤝 Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository**

   Click the "Fork" button at the top right of this page.

2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/Kreditozrouti.git
   cd Kreditozrouti
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up development environment**

   Follow the [Getting Started](#-getting-started) guide.

5. **Make your changes**

   - Write clean, readable code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation if needed

6. **Lint and format your code**

   ```bash
   make lint
   make format
   ```

7. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` – New feature
   - `fix:` – Bug fix
   - `docs:` – Documentation changes
   - `style:` – Code style changes (formatting, etc.)
   - `refactor:` – Code refactoring
   - `test:` – Adding or updating tests
   - `chore:` – Maintenance tasks

8. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**

   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes clearly
   - Reference any related issues

### Contribution Guidelines

- **Code Style:** Follow the existing code style. Run `make lint` and `make format` before committing.
- **Testing:** Add tests for new features. Ensure all tests pass.
- **Documentation:** Update relevant documentation in `docs/` folder.
- **Commit Messages:** Use conventional commit format.
- **Small PRs:** Keep pull requests focused on a single feature or fix.
- **Describe Changes:** Provide clear descriptions in PR descriptions.

### Areas for Contribution

We're especially looking for help with:

- 🐛 **Bug Fixes** – Report or fix issues
- ✨ **Features** – Add new functionality
- 📝 **Documentation** – Improve or translate docs
- 🎨 **UI/UX** – Design improvements
- 🧪 **Testing** – Add unit/integration tests
- 🌐 **Translations** – Add language support
- ♿ **Accessibility** – Improve a11y compliance
- 🚀 **Performance** – Optimize slow operations

### Reporting Issues

Found a bug or have a feature request?

1. **Check existing issues** to avoid duplicates
2. **Create a new issue** with a clear title and description
3. **Include:**
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots/GIFs if applicable
   - Browser/environment details

---

## 🚀 Deployment

For production deployment instructions, see [**docs/DEPLOYMENT.md**](docs/DEPLOYMENT.md).

### Quick Deploy with Docker

```bash
# Build images
make build-docker-images

# Deploy with Docker Compose
docker compose up -d
```

### Environment Setup

1. Configure production environment variables in `.env`
2. Set up MySQL and Redis instances
3. Configure reverse proxy (nginx/Caddy)
4. Set up SSL certificates
5. Configure scheduled jobs for scraping

For detailed instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 📄 License & Compliance

This project is provided for educational and personal use. For legal and compliance information, see the following documents:

- [Compliance Policy (Czech)](client/public/compliance/kreditozrouti-compliance-cs.pdf)
- [Compliance Policy (English)](client/public/compliance/kreditozrouti-compliance-en.pdf)

**Important Notes:**
- This project is **not officially affiliated** with VŠE (Prague University of Economics and Business)
- Data is scraped from InSIS and may not be 100% accurate
- Use at your own risk
- Respect InSIS terms of service and rate limits
- Do not use for commercial purposes without permission

---

## 👥 Authors & Credits

### Core Team

- **Project Lead & Development** – [@H7KZ](https://github.com/H7KZ)

### Acknowledgments

- **VŠE Prague** – For providing the InSIS system (even if we're improving upon it)
- **Contributors** – See [Contributors](https://github.com/H7KZ/Kreditozrouti/graphs/contributors)
- **Students** – For feedback and feature requests

---

## 📧 Contact & Support

### Get Help

- 🐛 **Bug Reports:** [GitHub Issues](https://github.com/H7KZ/Kreditozrouti/issues)
- 💡 **Feature Requests:** [GitHub Issues](https://github.com/H7KZ/Kreditozrouti/issues)
- 📧 **Email:** support@kreditozrouti.cz

### Links

- 🌐 **Official Website:** [Coming Soon]
- 📖 **Documentation:** [docs/](docs/)
- 🔗 **InSIS:** https://insis.vse.cz
- 🏛️ **VŠE Prague:** https://www.vse.cz

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=H7KZ/Kreditozrouti&type=Date)](https://star-history.com/#H7KZ/Kreditozrouti&Date)

---

## 📊 Project Status

- ✅ **Beta Release** – Core features implemented and tested
- 🚧 **Active Development** – New features being added regularly
- 🎯 **Target Launch** – February 2026 (registration period)

### Roadmap

- [x] Core scraping functionality
- [x] Study plan wizard
- [x] Advanced filtering
- [x] Timetable view with conflict detection
- [x] Multi-language support (Czech/English)
- [ ] Mobile responsiveness
- [ ] User accounts and saved schedules
- [ ] Course reviews and ratings
- [ ] Exam schedule integration
- [ ] Push notifications for course changes
- [ ] API public access with rate limiting

---

<div align="center">
  <p>Made with ❤️ for VŠE students</p>
  <p>
    <a href="#-about">About</a> •
    <a href="#-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-documentation">Documentation</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>
