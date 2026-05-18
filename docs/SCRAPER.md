# Scraper — Documentation Index

The scraper documentation is split into focused files for easier navigation.

## Documents

| File | Contents |
|---|---|
| [scraper/README.md](scraper/README.md) | Architecture overview, data flow diagram, directory structure, technology choices |
| [scraper/JOBS.md](scraper/JOBS.md) | Every job type: input payload, step-by-step flow, output, error handling |
| [scraper/EXTRACTION.md](scraper/EXTRACTION.md) | How each extraction service parses InSIS HTML — selectors, edge cases, parsing strategies |
| [scraper/QUEUE.md](scraper/QUEUE.md) | BullMQ queue topology, deduplication, retry policy, scheduler, QueueService API |
| [scraper/TYPES.md](scraper/TYPES.md) | Complete TypeScript type reference for all scraped data and job payload shapes |
| [scraper/INTERNALS.md](scraper/INTERNALS.md) | Clustering, wide-event logger, error classes, HTTP client, concurrency utility, config |

## Quick Orientation

**"How does data get from InSIS into MySQL?"**
→ [scraper/README.md — Complete Data Flow](scraper/README.md#complete-data-flow)

**"What does the Catalog job do exactly?"**
→ [scraper/JOBS.md — InSIS:Catalog](scraper/JOBS.md#inSiscatalog)

**"How does the scraper parse course timetables?"**
→ [scraper/EXTRACTION.md — Timetable](scraper/EXTRACTION.md#timetable-extracttimetable)

**"Why does my course job not retry on parse errors?"**
→ [scraper/INTERNALS.md — Error Classes](scraper/INTERNALS.md#error-classes-errorsinsiservorts)

**"What does ScraperInSISCourse look like?"**
→ [scraper/TYPES.md — ScraperInSISCourse](scraper/TYPES.md#scraperinsisscourse)

**"How does the 3 AM scheduler work?"**
→ [scraper/QUEUE.md — Scheduler](scraper/QUEUE.md#scheduler)
