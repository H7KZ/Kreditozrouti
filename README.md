# Kreditozrouti

**Live Demo:** https://enthusiastic-sparkle-production-0d2d.up.railway.app/

---

## English

### Overview

**Kreditozrouti** is a course scheduling and discovery application designed to help students find university courses that fit their timetable. The platform provides an intuitive interface for filtering courses by day, time, and faculty, making it easier to build a custom class schedule.

### Features

- **Course Search & Filtering**: Search for courses by day of the week, time slots, and faculty.
- **Responsive UI**: Built with React and TypeScript for a smooth user experience.
- **RESTful API**: Express.js backend serving course data with CORS-enabled cross-origin requests.
- **Production-Ready**: Deployed on Railway with proper session management, security headers (Helmet), and compression.

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express 5 + TypeScript
- **Data**: JSON-based course catalog with timetable information
- **Deployment**: Railway (Node.js runtime)

### Project Structure

```
├── api/                      # Express backend
│   ├── src/
│   │   ├── app.ts           # Express app with CORS, middleware setup
│   │   ├── index.ts         # Server entry point
│   │   ├── subjects.ts      # Course data loader
│   │   ├── Controllers/     # Request handlers
│   │   ├── Routes/          # API routes
│   │   ├── Data/            # subjects.json (course catalog)
│   │   └── Config/          # Environment configuration
│   └── package.json
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx          # Main component
│   │   ├── components/      # UI components (DropdownDay, DropdownFaculty, etc.)
│   │   └── styles/          # Component styles
│   └── package.json
│
└── scripts/                  # Data processing utilities
    ├── scraper_catalog.js   # Scrapes course catalog
    ├── scraper_details.js   # Scrapes course details
    └── subject_details.json # Processed course data
```

### Getting Started

#### Backend (API)

```bash
cd api
npm install
npm run dev              # Start dev server (http://localhost:6767)
npm run build           # Build for production (includes copying Data/ to dist/)
npm run start           # Run production build
```

#### Frontend

```bash
cd frontend
npm install
npm run dev             # Start dev server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build
```

### Key Patterns & Architecture

- **CORS Handling**: Configured for cross-origin requests between frontend and API; preflight requests handled via middleware.
- **Session Management**: Express-session with secure cookie options for production.
- **Data Loading**: Course data (`subjects.json`) is loaded at app startup and cached in memory.
- **TypeScript Paths**: `@api/` and `@api/...` aliases for clean imports (configured in `tsconfig.json` and `tsconfig-paths`).

### Environment Variables

Set these in your `.env` or Railway dashboard:

- `NODE_ENV`: `development` or `production`
- `PORT`: Server port (default: 6767)
- `PUBLIC_URL`: Public URL of the API (e.g., `https://kreditozrouti-production.up.railway.app`)
- `SESSION_SECRET`: Secret key for session encryption
- `RAILWAY_STATIC_URL`: Railway-provided domain for cookies

---

## Česky

### Přehled

**Kreditozrouti** je aplikace pro vyhledávání a plánování kurzů navržená tak, aby studentům pomohla najít vysokoškolské kurzy, které se vejdou do jejich rozvrhu. Platforma poskytuje intuitivní rozhraní pro filtrování kurzů podle dne v týdnu, času a fakulty, což usnadňuje vytvoření vlastního plánu třídy.

### Funkce

- **Vyhledávání & Filtrování Kurzů**: Vyhledávejte kurzy podle dne v týdnu, časových slotů a fakulty.
- **Responzivní UI**: Vytvořeno pomocí React a TypeScript pro hladkou uživatelskou zkušenost.
- **RESTful API**: Backend Express.js sloužící data kurzů s povoleným CORS pro požadavky z jiných domén.
- **Připraveno pro Produkci**: Nasazeno na Railway se správou relací, bezpečnostními hlavičkami (Helmet) a kompresí.

### Technologický Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Node.js + Express 5 + TypeScript
- **Data**: JSON-katalog kurzů s informacemi o rozvrhu
- **Nasazení**: Railway (Node.js runtime)

### Struktura Projektu

```
├── api/                      # Express backend
│   ├── src/
│   │   ├── app.ts           # Express aplikace s CORS, middleware nastavením
│   │   ├── index.ts         # Vstupní bod serveru
│   │   ├── subjects.ts      # Zavaděč dat kurzů
│   │   ├── Controllers/     # Obslužné programy požadavků
│   │   ├── Routes/          # API trasy
│   │   ├── Data/            # subjects.json (katalog kurzů)
│   │   └── Config/          # Konfigurování prostředí
│   └── package.json
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx          # Hlavní komponenta
│   │   ├── components/      # UI komponenty (DropdownDay, DropdownFaculty, atd.)
│   │   └── styles/          # Styly komponent
│   └── package.json
│
└── scripts/                  # Utility pro zpracování dat
    ├── scraper_catalog.js   # Scrapuje katalog kurzů
    ├── scraper_details.js   # Scrapuje detaily kurzů
    └── subject_details.json # Zpracovaná data kurzů
```

### Začínáme

#### Backend (API)

```bash
cd api
npm install
npm run dev              # Spusťte dev server (http://localhost:6767)
npm run build           # Vytvořte pro produkci (zahrnuje kopírování Data/ do dist/)
npm run start           # Spusťte produkční build
```

#### Frontend

```bash
cd frontend
npm install
npm run dev             # Spusťte dev server (http://localhost:5173)
npm run build           # Vytvořte pro produkci
npm run preview         # Náhled produkčního buildu
```

### Klíčové Vzory & Architektura

- **Zpracování CORS**: Nakonfigurováno pro požadavky z jiných domén mezi frontendem a API; preflight požadavky jsou zpracovávány prostřednictvím middleware.
- **Správa Relací**: Express-session se zabezpečenými volbami cookies pro produkci.
- **Zavaděč Dat**: Data kurzů (`subjects.json`) se načítají při spuštění aplikace a ukládají do mezipaměti.
- **TypeScript Cesty**: Aliasy `@api/` a `@api/...` pro čistý import (nakonfigurováno v `tsconfig.json` a `tsconfig-paths`).

### Proměnné Prostředí

Nastavte tyto v `.env` nebo na panelu Railway:

- `NODE_ENV`: `development` nebo `production`
- `PORT`: Port serveru (výchozí: 6767)
- `PUBLIC_URL`: Veřejná URL API (např. `https://kreditozrouti-production.up.railway.app`)
- `SESSION_SECRET`: Tajný klíč pro šifrování relací
- `RAILWAY_STATIC_URL`: Doména poskytovaná Railway pro cookies

---

**Live Demo:** https://enthusiastic-sparkle-production-0d2d.up.railway.app/
