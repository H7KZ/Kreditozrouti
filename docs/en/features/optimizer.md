---
title: Optimizer
description: Automatically generate conflict-free schedule combinations.
---

# Optimizer

The Optimizer tab (sparkles icon in the header) auto-generates conflict-free timetable candidates instead of building
your schedule course-by-course. It's ideal when you have a set of courses you need and want to find the best arrangement
quickly.

## Setup

### 1. Add courses to your basket

Type a course code or name in the search box and click to add. Remove courses with the × button. The basket holds the
courses you want the solver to schedule.

### 2. Set constraints (all optional)

| Constraint                | What it does                                                                                                               |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------|
| **Min / max ECTS**        | Total credit range for the generated schedule                                                                              |
| **Preferred days**        | Toggle the days you'd like classes on — the solver deprioritises other days but won't block them if there's no alternative |
| **Blackout windows**      | Mark time ranges when you're unavailable (e.g. a part-time job or standing commitment)                                     |
| **Max consecutive hours** | Cap how many hours can be scheduled back-to-back                                                                           |

### 3. Generate

Click **Generate timetables**. Constraints are saved automatically and reused the next time you open the tab.

---

## Results

The solver runs two passes:

**All courses scheduled** — up to 5 ranked candidates where every basket course fits without conflicts.

**If you drop one course…** — one best candidate per basket course, showing what the schedule looks like if that course
is removed. Only shown when no full schedule exists.

---

## Reading a Result Card

Each result card shows a **mini timetable grid**. Click a card to open a full timetable preview with the weekly grid.

In the preview:

- **Newly added units are highlighted in amber** so you can see exactly what would change versus your current schedule.
- A **score breakdown** shows penalty points for: campus conflicts, schedule gaps, off-preferred days, and long
  back-to-back study blocks. Lower score = better schedule.

Click **Use this timetable** in the preview to apply the candidate. Your current timetable is replaced.
