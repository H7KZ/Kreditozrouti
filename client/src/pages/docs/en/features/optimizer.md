---
title: Optimizer
section: Features
order: 3
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
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Min / max ECTS**        | Total credit range for the generated schedule                                                                              |
| **Preferred days**        | Toggle the days you'd like classes on - the solver deprioritises other days but won't block them if there's no alternative |
| **Blackout windows**      | Mark time ranges when you're unavailable (e.g. a part-time job or standing commitment)                                     |
| **Max consecutive hours** | Cap how many hours can be scheduled back-to-back                                                                           |

### 3. Generate

Click **Generate timetables**. Constraints are saved automatically and reused the next time you open the tab.

---

## Results

The solver runs two passes:

**All courses scheduled** - up to 5 ranked candidates where every basket course fits without conflicts.

**If you drop one course…** - one best candidate per basket course, showing what the schedule looks like if that course
is removed. Only shown when no full schedule exists.

---

## Reading a Result Card

Each result card shows a **mini timetable grid** plus a **quality tier** - Perfect, Good, Okay, or Rough (a green-to-red
badge) - and a short plain-language summary of what makes it imperfect, such as "1h 20min gaps" or "1 class on a
non-preferred day". Campus switches are called out explicitly, and any candidate with a campus switch is capped at Okay.
A flawless candidate reads "Perfect - No gaps, no conflicts". The same tier and reasons appear on the "drop one course"
cards. Click a card to open a full timetable preview with the weekly grid.

In the preview:

- **Newly added units are highlighted in amber** so you can see exactly what would change versus your current schedule.
- A **score breakdown** shows penalty points for: campus conflicts, schedule gaps, off-preferred days, and long
  back-to-back study blocks. Lower score = better schedule.

Click **Use this timetable** in the preview to apply the candidate. Your current timetable is replaced.

---

## What Else Fits?

Below the results, the **"What else fits?"** explorer suggests courses from your study plan that could still be added to
your basket. Pick a category (and optionally a group), then **Find fits**. Each suggested course's best timetable shows
the **same quality tier and plain-language reasons** as the result cards above - a Perfect / Good / Okay / Rough badge
tells you at a glance how well it slots in, with the same reasons (gaps, off-preferred days, campus switches, long study
blocks). Courses with no conflict-free schedule are marked as such. Click **Preview** to see the timetable with that
course added and apply it.
