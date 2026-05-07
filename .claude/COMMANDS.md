# COMMANDS.md — Claude Code Patterns for Kreditožrouti

Project-specific conventions for agents working on this repo.

---

## Before You Start Any Task

1. Read `client/CLAUDE.md` if touching frontend code.
2. Read `api/src/Controllers/` and `api/src/Services/` if touching backend code.
3. Run `cd client && pnpm run type-check` to establish a clean baseline before making changes.
4. Run `git log --oneline -10` to understand recent changes and avoid duplicating work.

---

## Store Rules

Memorise the store ownership boundaries — crossing them creates bugs:

| Data | Store |
|------|-------|
| Filter state (faculty, level, time, etc.) | `filtersStore` (`client/src/stores/filters.store.ts`) |
| Course search results + facets + pagination | `coursesStore` (`client/src/stores/courses.store.ts`) |
| Selected timetable units + conflict detection | `timetableStore` (`client/src/stores/timetable.store.ts`) |
| Wizard navigation + faculty/year/study plan selections | `wizard.store.ts` |
| Wizard remote data (facet lists, loading state) | `wizard-data.store.ts` |
| Completed course idents | `completed-courses.store.ts` |

**Hard rules:**
- Never import `coursesStore` from `timetableStore` (circular dependency).
- Never import from `@api/Services/*` in client stores — use API endpoints via `client/src/services/` and `api.ts`.
- `filtersStore` is the only place filter values live. `coursesStore` reads from it, never duplicates it.

---

## Adding a New Course Filter (step by step)

1. `api/src/Validations/CoursesFilterValidation.ts` — add field to the Zod schema.
2. `api/src/Services/CourseService.ts` — add the corresponding `WHERE` clause to the Kysely query builder.
3. `client/src/types/` (or the shared API type `CoursesFilter`) — add the field to the TypeScript type.
4. `client/src/stores/filters.store.ts` — add a `ref`, a setter using `setFilter()`, include it in the `resetFilters()` default, and pass it in the `fetchCourses` payload.
5. `client/src/components/filters/FilterPanel.vue` — add to the `facetConfig` array for checkbox groups, or add a bespoke block for toggles.
6. `client/src/locales/en.json` + `client/src/locales/cs.json` — add i18n keys.

---

## Adding a New Collision Type

1. `client/src/utils/timetable.ts` — add a pure detection function (no Vue, no i18n imports).
2. `client/src/types/course.ts` — add the new status string to the `CourseStatusType` union and `CourseStatus.status` field.
3. `client/src/stores/timetable.store.ts` — add a `computed` parallel to `campusConflicts`; extend the `courseStatuses` precedence chain (`conflict > campus-conflict > your-new-type > incomplete > selected`).
4. `client/src/components/timetable/TimetableCourseBlock.vue` — add the visual style for the new status.
5. `client/src/components/courses/UnitSelector.vue` — add an alert banner for the new conflict type.
6. `client/src/components/courses/CourseTable.vue` — add a tag for the new conflict type.
7. `client/src/locales/en.json` + `client/src/locales/cs.json` — add i18n strings.

---

## Adding a New API Endpoint

1. `api/src/Validations/` — create a Zod validation schema.
2. `api/src/Controllers/Kreditozrouti/` — create a controller class.
3. `api/src/Services/` — create a service class with Kysely queries.
4. `api/src/Routes/KreditozroutiRoutes.ts` — register the route.
5. `api/bruno/Kreditozrouti/` — create a `.bru` test file.
6. `client/src/services/` — add a service function calling `api.post()` (or `api.get()`).

---

## Type-Check Before Committing

```bash
cd client && pnpm run type-check
```

Never commit with TypeScript errors. Run this after every non-trivial change.

---

## Commit Convention

| Prefix | Use for |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code structure change with no behaviour change |
| `style:` | CSS / visual-only change |
| `docs:` | Documentation only |

---

## Campus Conflict Constants

- Travel time buffer: `CAMPUS_TRAVEL_MINUTES` in `client/src/utils/timetable.ts`
- Jižní Město room prefixes: `JM_PREFIXES` array in the same file
- Žižkov room prefixes: `ZIZKOV_PREFIXES` array in the same file (`RB`, `NB`, `IB`, `SB`)

When adjusting the travel buffer or adding a campus, edit only these arrays/constant — detection logic reads from them automatically.
