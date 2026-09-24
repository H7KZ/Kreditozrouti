# Shared domain

Domain values and types are defined in [`packages/types/src/domain.ts`](../../packages/types/src/domain.ts). Pure operations are exported from [`@kreditozrouti/core/domain`](../../packages/core/src/domain/index.ts).

| Concern | Source | Key rule |
|---------|--------|----------|
| Days, semesters, unit types, campuses, `TimeSelection` | [`types/domain.ts`](../../packages/types/src/domain.ts) | Use the shared values and types across packages. |
| Time conversion | [`core/domain/time.ts`](../../packages/core/src/domain/time.ts) | Store times as minutes from midnight; convert at display or input boundaries. |
| Conflict and completeness checks | [`core/domain/timetable.ts`](../../packages/core/src/domain/timetable.ts) | Campus travel requires 40 minutes; an unknown campus does not raise a campus conflict. |
| Academic periods | [`core/domain/period.ts`](../../packages/core/src/domain/period.ts) | Keep period calculations in one place. |
| InSIS slot classification | [`core/domain/insis.ts`](../../packages/core/src/domain/insis.ts) | Use `getSlotType()` rather than local string matching. |

The [domain glossary](../DOMAIN.md) explains course, unit, slot, and timetable terms. The code linked above is the source for exact function signatures.
