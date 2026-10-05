# Timetable and conflicts

The timetable stores selected teaching slots as `SelectedCourseUnit` snapshots. Each snapshot includes course and unit IDs, day or date, start and end time, location, and the unit types available when it was selected. This lets the timetable check completeness without importing the courses store.

## Time and layout

All times are minutes after midnight: `07:30` is `450`; `20:00` is `1200`. `apps/web/src/constants/timetable.ts` defines the grid span, 15-minute drag snapping, and display geometry. The grid shows Monday through Friday. `useTimetableGrid` positions overlapping blocks; `useSlotMerging` combines suitable one-time slots for display.

The timetable store groups units by course and day, counts each course's ECTS once, and persists selected units under `kreditozrouti:timetable`. The saved-schedule store keeps up to five named schedules under `kreditozrouti:schedule-slots`.

## Status precedence

`timetable.store.ts` assigns one status per selected course, in this order:

1. `conflict`: selected slots overlap in time.
2. `campus-conflict`: different known campuses with a gap shorter than 40 minutes.
3. `incomplete`: a required unit type has not been selected.
4. `selected`: no detected issue.

Conflict and campus checks come from `@kreditozrouti/core/domain/timetable`, re-exported by `apps/web/src/utils/timetable.ts`. Unknown room locations do not produce a campus conflict. The status map drives the list, grid, and summary.

## Adding and filtering

`useCourseUnitSelection` handles slot selection and replaces an existing slot of the same unit type when appropriate. `timetable.store.ts` then persists the selection and updates the timetable-based exclusion times in `filters.store.ts`.

When **Hide conflicting courses** is enabled, `filters.store.ts` combines manual excluded times with selected timetable times. `courses.store.ts` sends the merged list to the API. The filter watcher on `/courses` refreshes results when this state changes.

Dragging across an empty grid area creates an included time range. Confirming the popover adds that range to the filters and switches to the course list.

## Sharing and export

`useShareTimetable` creates a share link for the selected schedule. `/s/:id` renders a read-only view that visitors can copy into a local schedule. `useICalExport` downloads an `.ics` calendar file; `useScheduleExport` handles image export.

See [Stores](STORES.md) for ownership and [Composables](COMPOSABLES.md) for the UI helpers.
