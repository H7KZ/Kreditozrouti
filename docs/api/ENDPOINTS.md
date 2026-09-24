# API endpoints

The route declarations in `api/src/Routes/` and schemas beside their controllers are authoritative. JSON validation errors use HTTP 403 with `type: "VALIDATION"`. Most data responses use `{ data, facets, meta }`, where `meta` contains `limit`, `offset`, `count`, and `total`.

## Public routes

| Method and path | Purpose | Request or response |
| --- | --- | --- |
| `POST /courses` | Search courses and return facets | `CoursesFilter` to `CoursesResponseDTO` |
| `POST /study_plans` | Search plans and return facets | `StudyPlansFilter` to `StudyPlansResponseDTO` |
| `POST /study_plans/courses` | Courses in selected plans | `StudyPlanCoursesFilter` to `StudyPlanCoursesResponseDTO` |
| `POST /optimize` | Solve a timetable | `OptimizeRequest` to `OptimizeResponseDTO` |
| `POST /courses/:id/scrape` | Queue a course refresh | `202 { jobId }` |
| `GET /courses/:id/scrape/status` | Watch refresh status | Server-sent events |
| `POST /share` | Save 1-50 selected units | `201 { id }` |
| `GET /share/:id` | Load selected units | `{ units }` |
| `POST /ical` | Save units, slot settings, and semester dates | `201 { id }` |
| `GET /ical/:id` | Download calendar | `text/calendar` |
| `GET /health` | Health check | `200 OK` |

The three search routes use a 300-second Redis cache. Search filters use `limit` and `offset`, not page numbers. The course filter supports text, faculty, period, language, lecturer, study plan, ECTS, delivery/completion mode, assessment, and included/excluded times. See [`packages/types/src/http.ts`](../../packages/types/src/http.ts) for exact fields. Times are minutes from midnight.

`POST /optimize` accepts `course_ids`, `constraints`, and `mode: "build" | "explore"` (default `build`). Explore mode also accepts `explore_course_ids`. The response has `full_candidates`, `removal_candidates`, `partial`, `pool_truncated`, and optional `explore_results`. Request limits are 30 base courses and 20 explored courses. See [`packages/types/src/optimizer.ts`](../../packages/types/src/optimizer.ts). The route allows 50 requests per 10 minutes per IP.

The scrape trigger allows 3 requests per 10 minutes per IP and 1 per course. Its status stream sends `progress`, then `complete` after the database update or `error` after a five-minute timeout. Share and iCal records expire after 180 days of inactivity; reading a record renews its expiry.

## Operator routes

All `/commands/*` routes and `GET /admin/stats` require `Authorization: Bearer <API_COMMAND_TOKEN>`.

| Method and path | Action |
| --- | --- |
| `POST /commands/insis/catalog` | Discover and optionally queue course pages |
| `POST /commands/insis/course` | Scrape one course URL |
| `POST /commands/insis/studyplans` | Discover and queue study plans |
| `POST /commands/insis/studyplan` | Scrape one plan URL |
| `POST /commands/insis/academic-schedules` | Refresh academic schedules |
| `POST /commands/insis/faculty-timetables` | Refresh public timetable flags |
| `POST /commands/insis/sweep` | Find missing courses and trigger targeted scraping |
| `POST /commands/insis/retry-failed` | Retry failed course or plan jobs |
| `GET /admin/stats` | Queue and database statistics |

`GET /metrics` exposes Prometheus metrics to internal monitoring. Proxy-header requests receive 404.

## Errors

The shared `ApiError` shape is `{ type, message, details? }`. Its factories return 401 (unauthorized), 403 (validation), 404 (not found), or 500 (internal). Rate limiters return 429 with `type: "RATE_LIMITED"`.
