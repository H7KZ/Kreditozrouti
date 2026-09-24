# Web composables

Composable source lives in `web/src/composables/`. Import from the barrel at `@web/composables` when it exports the helper; use a direct path for helpers such as the shared course-status filter. Exact arguments and return values live beside each implementation.

| Area | Helpers | Use |
| --- | --- | --- |
| Time and slots | `useTimeUtils`, `useSlotSorting`, `useSlotFormatting`, `useSlotMerging`, `useScheduleSummary` | Convert and display timetable data |
| Grid interaction | `useTimetableGrid`, `useTimetableDrag`, `usePopover`, `useClickOutside` | Position blocks and handle pointer UI |
| Course selection | `useCourseUnitSelection`, `useCourseRefresh`, `useCourseLabels` | Select or refresh slots and display labels |
| Filters | `useTimeFilterMatching`, `useFacetFiltering`, `useCourseStatusFilter`, `useSharedCourseStatusFilter` | Match time windows, facets, and status categories |
| Optimizer | `useOptimizer`, `useOptimizerBasket`, `useFitScore` | Generate and rank timetable options |
| Export and sharing | `useICalExport`, `useScheduleExport`, `useShareTimetable` | Download calendar or image; create share links |
| Other | `useDebounce`, `useDebouncedFn`, `useDocsNav` | Delay UI work and build docs navigation |

## Rules worth keeping

- `CourseStatusFilter.vue` and `CourseStatusSummary.vue` use the module-level `useSharedCourseStatusFilter()` instance. `courses.vue` calls `resetCourseStatusFilter()` on unmount so state does not leak into a later visit.
- A composable using `onMounted` or `onUnmounted` belongs in component setup. Pure helpers such as `computeFitScores` can also run in computed state.
- Store code uses `i18n.global`; `useI18n()` is for component setup.
- `useTimetableDrag` keeps pointer behavior out of `TimetableGrid.vue`. Time selections snap to 15-minute intervals.

See [Timetable](TIMETABLE.md) for status precedence and [Stores](STORES.md) for state ownership.
