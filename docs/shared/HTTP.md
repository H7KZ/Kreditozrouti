# Shared HTTP contracts

[`packages/types/src/http.ts`](../../packages/types/src/http.ts) defines request filters, response DTOs, facets, pagination, sharing, iCal, and admin response types. API handlers produce these shapes; the web app consumes them.

| Contract | Examples | Related reference |
|----------|----------|-------------------|
| Course search | `CoursesFilter`, `CoursesResponseDTO`, `CourseWithRelationsDTO` | [Course endpoints](../api/ENDPOINTS.md) |
| Study plans | `StudyPlansFilter`, `StudyPlanCoursesFilter`, study plan DTOs | [Study plan endpoints](../api/ENDPOINTS.md) |
| Timetable sharing and iCal | `ShareCreateRequest`, `ShareGetResponse`, `ICalCreateRequest` | [API endpoints](../api/ENDPOINTS.md) |
| Optimizer | Request and response types in [`types/optimizer.ts`](../../packages/types/src/optimizer.ts) | [Optimizer endpoint](../api/ENDPOINTS.md) |

Import from `@kreditozrouti/types` in both API and web code. Check the source for the complete field list before changing a wire format.
