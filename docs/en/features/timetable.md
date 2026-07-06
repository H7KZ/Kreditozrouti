---
title: Timetable
description: Building and managing your weekly timetable.
---

# Timetable

## Views

Switch between three ways to see your courses using the tabs in the header bar:

| View             | What you see                                                                           |
|------------------|----------------------------------------------------------------------------------------|
| **Course List**  | Sortable table — course code, title, faculty, ECTS, completion mode, schedule summary  |
| **My Timetable** | Weekly grid Monday–Friday, 07:30–20:00 — selected courses shown as coloured blocks     |
| **Optimizer**    | Basket-based timetable generator — pick courses, set constraints, get ranked schedules |

Course List and My Timetable preferences are saved between sessions. Optimizer constraints are also saved and reused the
next time you open the tab.

---

## Building Your Timetable

1. Click any course row to expand it.
2. The expanded row shows course metadata (faculty, ECTS, language, category), prerequisite chips, and a collapsible *
   *Syllabus** section with aims, learning outcomes, course contents, and literature. When the UI language is set to
   English and English content is available, the English version is shown.
3. Below the syllabus: all available **unit types** (lecture, exercise, seminar) and their time slots.
4. Click a slot to add it to your timetable. If you already have a unit of the same type selected for this course, it is
   swapped out automatically.
5. Repeat for each unit type the course requires. Some courses have only lectures; others require both a lecture and an
   exercise.

Your timetable is saved in your browser's local storage — it survives page reloads, closing the tab, and restarting your
browser. The right-side panel shows all selected units grouped by course, with your total ECTS count.

### Clicking a Block on the Timetable Grid

Clicking a coloured block in the timetable grid opens a course detail panel from the right edge. The panel shows the
day, time, room, and lecturer for that slot, then loads the full course detail below. From the panel you can:

- **Search in timeslot** — switches to the Course List view pre-filtered to courses available in that exact time window
- **Remove from timetable** — removes all slots of that course at once
- **Open in InSIS** — external link in the course title

---

## Conflict Detection

Every course you add to the timetable gets a status. The status bar at the top of the page counts each category — click
a category to filter the course list to just those courses.

| Status              | Colour | Meaning                                                                                                                                            |
|---------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| **Selected**        | Blue   | All required unit types chosen, no time or campus conflicts                                                                                        |
| **Incomplete**      | Amber  | You've selected at least one unit type but not all required ones — e.g. added the lecture but not the exercise yet                                 |
| **Campus conflict** | Orange | No time overlap, but the gap between classes on different VŠE campuses is under 40 minutes — not enough travel time between Žižkov and Jižní Město |
| **Conflict**        | Red    | Two selected courses overlap in time on the same day                                                                                               |

### Campus Conflict Detail

VŠE has two main campuses:

- **Žižkov** — rooms starting with RB, NB, IB, or SB
- **Jižní Město** — rooms starting with JM

If you select a course on one campus and another course on the other campus with less than 40 minutes between them, the
app flags a campus conflict. If a room's campus cannot be determined, no campus conflict is raised.

---

## Drag-to-Filter

Available in **My Timetable** view.

1. Click and drag across any empty area of the grid to select a time range.
2. A popover appears showing the day and time you selected.
3. Click **Search courses** to confirm.
4. The app switches to Course List view and filters to courses that have a slot in that time window.

This is the fastest way to answer "what's available Tuesday morning between 9 and 11?"

To remove the time filter: open the **Time restriction** section in the filter sidebar and remove the entry, or click *
*Clear all**.

---

## Saved Schedules

Compare up to 5 different timetable alternatives without losing your work. Access the schedule picker from the **My
Timetable** view.

| Action           | What it does                                                      |
|------------------|-------------------------------------------------------------------|
| **Save current** | Saves a snapshot of your current timetable with a name you choose |
| **Duplicate**    | Copies an existing snapshot so you can experiment from it         |
| **Switch**       | Loads a saved snapshot as your working timetable                  |
| **Delete**       | Removes a saved snapshot                                          |

Use this to build "Plan A: all mornings" and "Plan B: Tuesday/Thursday only" side by side, then compare.

---

## Share Timetable

Share your current timetable with anyone via a short link.

1. Build your timetable as usual.
2. Click the **Share** button (share icon) in the timetable toolbar.
3. A link is automatically copied to your clipboard (e.g. `https://kreditozrouti.cz/s/abc123`).

**What the recipient sees:**

- A read-only timetable grid showing all your selected courses
- Course count and total ECTS credit load
- A **Copy link** button to share the URL further
- A **Save to my timetable** button to fork the snapshot into one of their own schedule slots for editing

Links expire after **180 days of inactivity** (the expiry resets on each view). The snapshot is self-contained, so links
survive database resets.

---

## Export to Calendar (iCal)

Use the calendar export button in the timetable toolbar to download an `.ics` file of your selected schedule. Import it
into Google Calendar, Apple Calendar, or Outlook — each course slot becomes a recurring weekly event for the semester.

---

## Refresh from InSIS

Course data is scraped from InSIS on a schedule. For the most current information on a specific course:

1. Expand the course row.
2. Click the **refresh icon** (circular arrow) next to the course name.
3. The app fetches live data from InSIS and updates the course in place — slots, lecturers, room assignments, capacity,
   and all other details.

**Rate limit:** once per 10 minutes per course. A countdown is shown if you try to refresh again too soon.

---

## Prerequisite Information

When a course's InSIS syllabus lists prerequisites, the expanded course row shows them as clickable chips grouped by
type:

| Label                      | Meaning                                                        | Clickable? |
|----------------------------|----------------------------------------------------------------|------------|
| **Required prerequisites** | Courses you must have passed before enrolling                  | Yes        |
| **Cannot study after**     | Courses after which you may no longer enrol in this course     | Yes        |
| **Cannot study alongside** | Courses that cannot be taken in the same semester as this one  | No         |
| **Recommended before**     | Courses suggested as prior study (from recommended programmes) | Yes        |

Clicking a chip sets the course code as the active **Search** filter — useful for quickly checking whether a
prerequisite is offered this semester.

**Filter effect:** when you activate **Completed courses** filtering (wizard Step 4 or the filter sidebar toggle):

- Courses where you haven't yet completed all **Required prerequisites** are hidden automatically.
- Courses that fall under **Cannot study after** for any of your completed courses are also hidden.

---

## Mark as Completed

Courses you've already passed can be hidden from the list to reduce noise.

**From inside the app (any time):**

1. Expand the course row.
2. Click **Mark as completed** at the bottom of the expanded row.
3. The course is hidden from the list (unless you toggle "Show completed courses" in the filter sidebar).

**From the wizard:** Step 4 of the wizard lets you bulk-mark completed courses before you start browsing.

To unmark: expand the course (visible when "Show completed courses" is on) and click **Mark as completed** again to
toggle it off.
