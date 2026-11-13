# InSIS extraction

Extraction services in `apps/scraper/src/Services/` turn server-rendered InSIS HTML into the types in [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts). Keep selectors and normalization close to each source page.

| Service                               | Reads                                   | Produces                                                                          |
| ------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| `ExtractInSISCatalogService`          | Extended course search form and results | Faculties, periods, course URLs and IDs                                           |
| `ExtractInSISCourseService`           | Czech and English syllabus pages        | Course metadata, bilingual content, assessments, units, slots, plan links, hashes |
| `ExtractInSISStudyPlanService`        | Plan navigation and detail pages        | Plan URLs and plan/course records                                                 |
| `ExtractInSISAcademicScheduleService` | Harmonogram index and period pages      | Faculties, periods, dated events                                                  |
| `ExtractInSISFacultyTimetableService` | Timetable navigation and faculty page   | Faculty ident and public visibility                                               |

`ExtractInSISCourseService.extractIdFromUrl` and `extractIdFromHtml` identify course records. `isNotFound` detects removed pages. Czech and English syllabus content is parsed separately; `MarkdownService` converts rich sections to Markdown. Course lecturers and guarantors are read from the "Vyučující" links; besides the display strings, `lecturer_refs` carries the InSIS person id from each `/lide/clovek.pl?id=` link with its role. Timetable unit lecturers are plain text with no link, so they have no id. The course's faculty comes from the bracket at the end of the page heading, `Sylabus předmětu 4IT101 - Title (FIS - ZS 2026/2027)`: InSIS dropped the `#titulek h1` heading in November 2026, so the parser falls back to the page `<title>`, which carries the same text. A course whose faculty cannot be read is stored with a null `faculty_id` and disappears from faculty filters and from the partner API. Timetable extraction keeps source clock strings and nullable values. The API performs minute conversion when it persists slots.

`ExtractInSISStudyPlanService` parses group codes using helpers from `@kreditozrouti/core/utils`. Shared HTML cleanup is in `apps/scraper/src/Utils/HTMLUtils.ts`; request headers are in `HTTPUtils.ts`.

Fixture HTML and expected scraper output live in `fixtures/`. The extraction source and those fixtures are the best place to confirm an InSIS markup assumption.
