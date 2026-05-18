# Modal Slot Conflict Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show inline conflict status badges (safe / hard conflict / campus conflict) on each unit row in `TimetableCourseModal` so students know which slots would create timetable conflicts before switching.

**Architecture:** All changes are confined to `TimetableCourseModal.vue` plus the two locale files. The timetable store already exposes `getUnitConflicts` and `getUnitCampusConflicts` methods that return typed conflict data — no store changes needed. A plain helper function in the modal computes the badge state per unit and the template renders it inline.

**Tech Stack:** Vue 3 Composition API, `useTimetableStore`, vue-i18n, Tailwind CSS / insis CSS vars.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `client/src/components/timetable/TimetableCourseModal.vue` |
| Modify | `client/src/locales/en.json` |
| Modify | `client/src/locales/cs.json` |

---

## Task 1: Add i18n keys

**Files:**
- Modify: `client/src/locales/en.json`
- Modify: `client/src/locales/cs.json`

The existing `TimetableCourseModal` block is at line 435 in both files. Add three keys to it.

- [ ] **Step 1: Add English keys**

In `client/src/locales/en.json`, inside the `"TimetableCourseModal"` object (after the last existing key `"filterDescription"`), add:

```json
"slotFree": "Free",
"slotConflict": "Conflict: {ident}",
"slotCampusConflict": "Campus: {ident}"
```

The object should end as:
```json
"TimetableCourseModal": {
    "courseNotFound": "Course not found",
    "loadError": "Failed to load course details",
    "courseInfo": "Course Information",
    "selectedSlot": "Selected Slot",
    "removeFromTimetable": "Remove from timetable",
    "searchInTimeslot": "Search in this timeslot",
    "filterApplied": "Time filter applied",
    "filterDescription": "Showing courses available on {day} from {from} to {to}",
    "slotFree": "Free",
    "slotConflict": "Conflict: {ident}",
    "slotCampusConflict": "Campus: {ident}"
},
```

- [ ] **Step 2: Add Czech keys**

In `client/src/locales/cs.json`, same location:

```json
"TimetableCourseModal": {
    "courseNotFound": "Předmět nenalezen",
    "loadError": "Nepodařilo se načíst detaily předmětu",
    "courseInfo": "Informace o předmětu",
    "selectedSlot": "Vybraný slot",
    "removeFromTimetable": "Odebrat z rozvrhu",
    "searchInTimeslot": "Hledat v tomto čase",
    "filterApplied": "Časový filtr aplikován",
    "filterDescription": "Zobrazuji předměty dostupné v {day} od {from} do {to}",
    "slotFree": "Volný",
    "slotConflict": "Konflikt: {ident}",
    "slotCampusConflict": "Kampus: {ident}"
},
```

- [ ] **Step 3: Verify JSON is valid**

```bash
cd client
node -e "JSON.parse(require('fs').readFileSync('src/locales/en.json','utf8')); console.log('en.json OK')"
node -e "JSON.parse(require('fs').readFileSync('src/locales/cs.json','utf8')); console.log('cs.json OK')"
```

Expected output:
```
en.json OK
cs.json OK
```

- [ ] **Step 4: Commit**

```bash
git add client/src/locales/en.json client/src/locales/cs.json
git commit -m "feat(i18n): add slot conflict badge keys to TimetableCourseModal"
```

---

## Task 2: Add conflict status helper and badges to TimetableCourseModal

**Files:**
- Modify: `client/src/components/timetable/TimetableCourseModal.vue`

- [ ] **Step 1: Import `useTimetableStore` and `CourseUnitDTO` type**

In `TimetableCourseModal.vue`, the `<script setup>` block already imports from `@client/stores`. Add `useTimetableStore` to that import and add the DTO type import:

```typescript
// existing line — extend it:
import { useCoursesStore, useFiltersStore, useUIStore, useTimetableStore } from '@client/stores'

// add after the existing @shared import line:
import type { CourseUnitDTO } from '@shared/http/responses'
```

Then instantiate the store (add after the existing store instantiations):

```typescript
const timetableStore = useTimetableStore()
```

- [ ] **Step 2: Add `getUnitConflictStatus` helper function**

Add this function in the `// Actions` section of the script (after `handleRemoveCourseAndClose`):

```typescript
type UnitConflictStatus =
	| { type: 'selected' }
	| { type: 'conflict'; ident: string }
	| { type: 'campus'; ident: string }
	| { type: 'free' }

function getUnitConflictStatus(courseUnit: CourseUnitDTO): UnitConflictStatus {
	if (isUnitSelected(courseUnit.id)) return { type: 'selected' }

	const hardConflicts = timetableStore
		.getUnitConflicts(courseUnit)
		.flatMap((c) => c.conflictingUnits)
		.filter((u) => u.courseId !== props.unit.courseId)

	if (hardConflicts.length > 0) return { type: 'conflict', ident: hardConflicts[0]!.courseIdent }

	const campusConflicts = timetableStore
		.getUnitCampusConflicts(courseUnit)
		.flatMap((c) => c.conflictingUnits)
		.filter((u) => u.courseId !== props.unit.courseId)

	if (campusConflicts.length > 0) return { type: 'campus', ident: campusConflicts[0]!.courseIdent }

	return { type: 'free' }
}
```

- [ ] **Step 3: Add badge markup to the unit row template**

In the template, find the unit row's `<div class="flex items-center justify-between p-2">`. Inside it, between the slot info `<div>` and the action button `<div class="ml-4 shrink-0">`, add the badge:

```html
<!-- Conflict status badge -->
<div class="mx-3 shrink-0">
	<template v-if="getUnitConflictStatus(courseUnit).type === 'conflict'">
		<span class="insis-badge insis-badge-danger text-xs">
			⚠ {{ $t('components.timetable.TimetableCourseModal.slotConflict', { ident: (getUnitConflictStatus(courseUnit) as { type: 'conflict'; ident: string }).ident }) }}
		</span>
	</template>
	<template v-else-if="getUnitConflictStatus(courseUnit).type === 'campus'">
		<span class="insis-badge insis-badge-warning text-xs">
			🏫 {{ $t('components.timetable.TimetableCourseModal.slotCampusConflict', { ident: (getUnitConflictStatus(courseUnit) as { type: 'campus'; ident: string }).ident }) }}
		</span>
	</template>
	<template v-else-if="getUnitConflictStatus(courseUnit).type === 'free'">
		<span class="text-xs text-[var(--insis-gray-400)]">
			✓ {{ $t('components.timetable.TimetableCourseModal.slotFree') }}
		</span>
	</template>
	<!-- 'selected' state: no extra badge — the green row border already signals it -->
</div>
```

The full unit row `<div class="flex items-center justify-between p-2">` should now look like:

```html
<div class="flex items-center justify-between p-2">
    <div class="flex w-full flex-col gap-1">
        <!-- existing slot info rows -->
        <div v-for="slot in courseUnit.slots" :key="slot.id" class="flex items-center gap-3">
            <span class="w-8 shrink-0 rounded bg-[var(--insis-gray-200)] px-1 py-0.5 text-center text-xs">
                {{ getShortUnitTypeLabel(getSlotType(slot)) }}
            </span>
            <span class="font-medium">{{ formatSlotInfo(slot) }}</span>
            <span class="truncate text-[var(--insis-gray-600)]">{{ slot.location || '-' }}</span>
        </div>
        <div v-if="courseUnit.capacity !== undefined" class="mt-1 pl-[44px]">
            <span :class="['text-xs', getCapacityClass(courseUnit.capacity)]">
                {{ formatCapacity(courseUnit.capacity) }}
            </span>
        </div>
    </div>

    <!-- Conflict status badge -->
    <div class="mx-3 shrink-0">
        <template v-if="getUnitConflictStatus(courseUnit).type === 'conflict'">
            <span class="insis-badge insis-badge-danger text-xs">
                ⚠ {{ $t('components.timetable.TimetableCourseModal.slotConflict', { ident: (getUnitConflictStatus(courseUnit) as { type: 'conflict'; ident: string }).ident }) }}
            </span>
        </template>
        <template v-else-if="getUnitConflictStatus(courseUnit).type === 'campus'">
            <span class="insis-badge insis-badge-warning text-xs">
                🏫 {{ $t('components.timetable.TimetableCourseModal.slotCampusConflict', { ident: (getUnitConflictStatus(courseUnit) as { type: 'campus'; ident: string }).ident }) }}
            </span>
        </template>
        <template v-else-if="getUnitConflictStatus(courseUnit).type === 'free'">
            <span class="text-xs text-[var(--insis-gray-400)]">
                ✓ {{ $t('components.timetable.TimetableCourseModal.slotFree') }}
            </span>
        </template>
    </div>

    <!-- Action button (unchanged) -->
    <div class="ml-4 shrink-0">
        <template v-if="isUnitSelected(courseUnit.id)">
            <button type="button" class="insis-btn bg-[var(--insis-surface)] px-3 py-1.5 text-xs hover:border-[var(--insis-danger)]" @click.stop="handleRemoveUnit(courseUnit)">
                <IconMinus class="h-4 w-4" />
            </button>
        </template>
        <template v-else>
            <button
                type="button"
                class="flex items-center gap-1 px-3 py-1.5 text-xs"
                :class="isGroupSatisfied(group.types) ? 'insis-btn-secondary' : 'insis-btn-primary'"
                @click.stop="handleAddUnit(courseUnit)"
            >
                <IconPlus v-if="!isGroupSatisfied(group.types)" class="h-3 w-3" />
                {{ isGroupSatisfied(group.types) ? $t('common.change') : $t('common.add') }}
            </button>
        </template>
    </div>
</div>
```

- [ ] **Step 4: Check that `insis-badge-danger` and `insis-badge-warning` exist**

```bash
grep -r "insis-badge-danger\|insis-badge-warning" client/src/styles/ client/src/index.css
```

If either class is missing, add it to `client/src/styles/insis.css` alongside the existing badge styles. Typical definitions:

```css
.insis-badge-danger {
    background-color: var(--insis-danger-light, #fef2f2);
    color: var(--insis-danger, #ef4444);
}
.insis-badge-warning {
    background-color: var(--insis-warning-light, #fffbeb);
    color: var(--insis-warning, #f59e0b);
}
```

- [ ] **Step 5: Type-check**

```bash
cd client && pnpm run type-check
```

Expected: no errors. If TypeScript complains about the `as` casts in the template, extract the status into a `const` in a `<template v-for>` wrapper using a computed map instead — but the inline cast should work fine with Volar.

- [ ] **Step 6: Manual smoke test**

1. Run `make dev` and open http://localhost:45173
2. Add at least two courses to your timetable that share a time slot on the same day
3. Click one of the conflicting course blocks in the timetable grid — the modal opens
4. In the unit slot list, the slot that overlaps the other course should show a red "⚠ Conflict: \<ident\>" badge
5. A slot with no conflicts should show the gray "✓ Free" label
6. If you have campus-separated courses with < 40 min gap, verify the amber "🏫 Campus: \<ident\>" badge appears

- [ ] **Step 7: Commit**

```bash
git add client/src/components/timetable/TimetableCourseModal.vue
git commit -m "feat(timetable): show conflict badges on slot options in course modal"
```
