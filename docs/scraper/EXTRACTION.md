# InSIS extraction

Extraction services in `apps/scraper/src/Services/` turn server-rendered InSIS HTML into the types in [`packages/types/src/queue.ts`](../../packages/types/src/queue.ts). Keep selectors and normalization close to each source page.

| Service | Reads | Produces |
| --- | --- | --- |
| `ExtractInSISCatalogService` | Extended course search form and results | Faculties, periods, course URLs and IDs |
| `ExtractInSISCourseService` | Czech and English syllabus pages | Course metadata, bilingual content, assessments, units, slots, plan links, hashes |
| `ExtractInSISStudyPlanService` | Plan navigation and detail pages | Plan URLs and plan/course records |
| `ExtractInSISAcademicScheduleService` | Harmonogram index and period pages | Faculties, periods, dated events |
| `ExtractInSISFacultyTimetableService` | Timetable navigation and faculty page | Faculty ident and public visibility |

`ExtractInSISCourseService.extractIdFromUrl` and `extractIdFromHtml` identify course records. `isNotFound` detects removed pages. Czech and English syllabus content is parsed separately; `MarkdownService` converts rich sections to Markdown. Timetable extraction keeps source clock strings and nullable values. The API performs minute conversion when it persists slots.

`ExtractInSISStudyPlanService` parses group codes using helpers from `@kreditozrouti/core/utils`. Shared HTML cleanup is in `apps/scraper/src/Utils/HTMLUtils.ts`; request headers are in `HTTPUtils.ts`.

Fixture HTML and expected scraper output live in `fixtures/`. The extraction source and those fixtures are the best place to confirm an InSIS markup assumption.
