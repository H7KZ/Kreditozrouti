# Client — Composable Reference

All composables are exported from `src/composables/index.ts`.

Two categories:

- **Pure transforms** — no Vue lifecycle hooks, no DOM access, safe to call anywhere
- **Interactive** — use `onMounted`/`onUnmounted` for event listeners or DOM side effects

---

## Pure Data Transforms

### `useTimeUtils()`

Time math and formatting. All times are in **minutes from midnight** (0–1439).

```typescript
minutesToTime(n
:
number
):
string          // 540 → '09:00'
timeToMinutes(s
:
string
):
number          // '09:00' → 540
formatTime(n
:
number
):
string             // locale-aware display
formatTimeRange(from, to)
:
string         // '09:00 – 10:30'
formatTimeSelection(ts
:
TimeSelection
):
string
calculateTimePosition(time, config)
:
number  // px offset from grid top
calculateTimeDuration(from, to, config)
:
number  // px height
generateTimeOptions(interval)
:
string[]   // '07:30', '07:45', ...
generateTimeSlots(config)
:
number[]       // [450, 495, 540, ...]
snapToInterval(time, interval)
:
number    // snap to 15-min grid
clampTime(time, config)
:
number           // clamp to START–END range
timeRangesOverlap(a, b)
:
boolean
```

### `useSlotMerging(unitsByDay)`

Merges recurring one-time slots (same day-of-week, course, time, type) into `MergedUnit` blocks for the timetable view.
Returns `mergedUnitsByDay` (computed `Map<InSISDay, MergedUnit[]>`).

One-time slots that recur weekly on the same day/time are collapsed into a single block with a `dates` array instead of
appearing as separate rows.

### `useSlotSorting()`

```typescript
sortSlots(slots)
:
CourseUnitSlotDTO[]    // sort by day index, then timeFrom
sortUnits(units)
:
CourseUnitDTO[]        // sort by first slot's day/time
sortUnitsByType(units)
:
CourseUnitDTO[]  // group by type: lecture → exercise → seminar
getUniqueDays(units)
:
InSISDay[]
getSlotDay(slot)
:
InSISDay | null        // slot.day ?? getDayFromDate(slot.date)
```

### `useDebounce(initialValue, opts)`

Debounced reactive ref pair:

```typescript
const {value, debouncedValue, cancel, flush} = useDebounce('', {delay: 750})
```

`value` updates immediately; `debouncedValue` updates after the delay. Useful for search inputs.

### `useDebouncedFn(fn, delay)`

Wraps a callback with debounce. Returns a function with `.cancel()`.

### `usePopover(position, opts)`

Viewport-safe popover positioning. Given a trigger position and a desired anchor side, computes CSS styles that keep the
popover visible.

```typescript
const {popoverStyle, calculatePosition, wouldOverflow} = usePopover(position, opts)
```

### `useSlotFormatting()`

Human-readable slot display text. No store access.

```typescript
formatSlotInfo(slot)
:
string       // full info string
formatSlotDay(slot)
:
string
formatSlotTime(slot)
:
string       // '09:00 – 10:30'
formatSlotLocation(slot)
:
string
formatSlotDate(slot)
:
string       // 'Po 15. 10.'
formatCapacity(slot)
:
string       // '30 míst'
getCapacityClass(slot)
:
string     // CSS class based on capacity
isBlockSlot(slot)
:
boolean         // single/one-time occurrence
isRecurringSlot(slot)
:
boolean
formatSlotsSummary(slots)
:
string  // compact day+time list
```

### `useScheduleSummary()`

Produces compact schedule text for the `ScheduleSlotsPanel`:

```typescript
getScheduleSummary(units)
:
string       // 'Po, St' (Czech day abbreviations)
getScheduleSummaryFull(units)
:
string   // 'Pondělí, Středa 09:00–10:30'
getTimeRangeSummary(units)
:
string
hasBlockSlots(units)
:
boolean
hasRecurringSlots(units)
:
boolean
```

---

## Store-Reading Composables

### `useTimetableGrid(unitsByDay, opts)`

Pixel geometry for timetable rendering. Takes merged units and time config, returns CSS helpers.

```typescript
timeSlots: number[]                          // time header values
getBlockStyle(unit, day)
:
CSSProperties     // left%, width%, top px, height px
getOverlapInfo(day)
:
OverlapInfo             // column-width for side-by-side blocks
overlapCache: Map <
...>
getTimeFromX(x, containerWidth)
:
number     // px → minutes
getDragSelectionStyle(drag)
:
CSSProperties  // CSS for drag highlight overlay
```

Block positioning uses percentage-based horizontal layout and pixel-based vertical layout so blocks resize with the
container width.

### `useCourseUnitSelection({ course })`

Groups a course's units by type composition and manages add/remove/swap in `timetableStore`.

**`unitsByGroup`** (computed): Groups units that have the same set of slot types (e.g. all "lecture only" units in one
group, all "exercise only" in another). Each group shows a selector so the user can pick one per type.

**`handleAddUnit(unit, slot)`**: Before adding, removes existing units of the same `unitType` from `timetableStore` (
swap behaviour). Then calls `timetableStore.addUnit()`.

```typescript
const {
    unitsByGroup, missingUnitTypes, isSelectionComplete, hasIncompleteSelection,
    handleAddUnit, handleRemoveUnit
} = useCourseUnitSelection({course})
```

### `useTimeFilterMatching()`

Checks whether a slot matches the currently active include/exclude time filters (reads `filtersStore`).

```typescript
slotMatchesTimeFilter(slot)
:
boolean          // matches any include_times entry
slotMatchesExcludeFilter(slot)
:
boolean       // conflicts with any exclude_times entry
unitMatchesTimeFilter(unit)
:
boolean          // any slot in unit matches
unitFullyMatchesTimeFilter(unit)
:
boolean     // all slots in unit match
getSlotHighlightClass(slot, type)
:
string     // CSS class for highlight
```

### `useFacetFiltering(facets, selected, opts)`

Handles the display of checkbox facets in `FilterCheckboxGroup`. Re-injects selected items that have dropped to 0
count (so selected filters stay visible even when the API would remove them from the facet list).

```typescript
const {
    combinedFacets, sortedFacets, filterBySearch, getVisibleFacets,
    toggleListExpanded, toggleSelection
} = useFacetFiltering(facets, selected, opts)
```

---

## Special Composables

### `useCourseLabels()`

i18n label lookup helpers. Reads `i18n.global`. Does not contain `getSlotType` logic (that lives in `utils/course.ts`),
but re-exports it for convenience alongside color/badge class helpers.

**Key exports:**

- `getSemesterLabel(s)`, `getCompletionLabel(s)`, `getFacultyLabel(id)`, `getLanguageLabel(s)`, `getLanguagesLabel(arr)`
- `getCategoryLabel(cat)`, `getGroupLabel(group)`, `getLevelLabel(level)`, `getCourseLevelLabel(level)`
- `getUnitTypeLabel(type)`, `getShortUnitTypeLabel(type)`, `getUnitTypeAccusativeLabel(type)`,
  `getUnitTypesGroupLabel(types)`
- `getDayLabel(day)`, `getShortDayLabel(day)`
- `getCourseTitle(course)`, `getUnitCourseTitle(unit)`
- `getUnitTypeColorClass(type)` — returns `bg-[var(--insis-block-lecture|exercise|seminar)]`
- `getCategoryBadgeClass(category)` — returns badge CSS class

### `useCourseStatusFilter()`

Creates local `selectedStatuses`/`selectedCourseIdents` state. Reads `timetableStore.courseStatuses`. When a filter is
applied, writes `filtersStore.filters.idents` and calls `coursesStore.fetchCourses()`.

When filtering by `'conflict'`, expands to include both sides of each conflict pair (so you see the conflicting course
even when it isn't in `selectedStatuses`).

**Singleton pattern:** Use `useSharedCourseStatusFilter()` (module-level singleton) in all components so status/ident
filter state is shared between `CourseStatusFilter.vue` and `CourseStatusSummary.vue`. Call `resetCourseStatusFilter()`
on page unmount.

```typescript
const {
    selectedStatuses, filterOptions, filteredCourseIdents,
    toggleStatus, clearFilter, applyFilter
} = useSharedCourseStatusFilter()
```

### `useCourseRefresh(courseId)`

Triggers a course scrape via SSE and updates `coursesStore` when complete.

```typescript
const {isRefreshing, refreshStatus, triggerRefresh} = useCourseRefresh(courseId)
```

**Flow:**

1. `triggerRefresh()` calls `courseService.triggerCourseScrape(id)` → gets `jobId`
2. Opens `EventSource` to `GET /courses/:id/scrape/status`
3. On `complete` event: calls `coursesStore.updateCourse(updatedCourse)`
4. Handles `progress`, `complete`, `error` events; auto-closes on complete or timeout

Handles `RateLimitedError` from `triggerCourseScrape` (429 response) gracefully with a user-facing message.

### `useTimetableDrag(gridRef, getTimeFromX)`

Manages mouse-event drag-to-select on the timetable grid. Registers global `mousemove`/`mouseup` listeners in
`onMounted`, removes in `onUnmounted`.

**After a completed drag:**

1. Sets `filtersStore.filters.include_times` to the selected time range
2. Calls `uiStore.switchToListView()` (so the user sees filtered course results)
3. Calls `coursesStore.fetchCourses()`

```typescript
const {handleMouseDown, handleDragFilter, handleDragCancel} = useTimetableDrag(gridRef, getTimeFromX)
```

### `useClickOutside(ref, opts)`

Registers click-outside and Escape key handlers via `onMounted`/`onUnmounted`.

```typescript
const {handleClickOutside, handleKeyDown} = useClickOutside(elementRef, {
    onClickOutside: () => close(),
    onEscape: () => close()
})
```

---

## Composable Patterns

### Pure vs. Interactive

```typescript
// Pure — no lifecycle, no DOM, safe to call from stores:
export function useMyTransform(data: Ref<Data[]>) {
    const result = computed(() => /* ... */)
    return {result}
}

// Interactive — has DOM access or event listeners:
export function useMyInteraction(elementRef: Ref<HTMLElement | null>) {
    function handler() { /* ... */
    }

    onMounted(() => document.addEventListener('click', handler))
    onUnmounted(() => document.removeEventListener('click', handler))
    return {handler}
}
```

### Using i18n in Composables

Composables run outside component setup (when called from stores), so `useI18n()` is not available. Use `i18n.global`
instead:

```typescript
import {i18n} from '@client/i18n'

export function useMyLabels() {
    const {t} = i18n.global
    return {label: t('some.key')}
}
```
