# Features Reference

A complete reference for every Kreditožrouti feature. Jump to the section you need.

- [Views](#views)
- [Filters](#filters)
- [Building your timetable](#building-your-timetable)
- [Conflict detection](#conflict-detection)
- [Drag-to-filter](#drag-to-filter)
- [Refresh from InSIS](#refresh-from-insis)
- [Saved Schedules](#saved-schedules)
- [Mark as completed](#mark-as-completed)
- [Language and theme](#language-and-theme)

---

## Views

Toggle between two ways to see your courses:

| View             | What you see                                                                          |
|------------------|---------------------------------------------------------------------------------------|
| **Course List**  | Sortable table — course code, title, faculty, ECTS, completion mode, schedule summary |
| **My Timetable** | Weekly grid Monday–Friday, 07:30–20:00 — selected courses shown as coloured blocks    |

Switch using the **Course List / My Timetable** buttons in the top bar. Your preference is saved.

---

## Filters

The left sidebar contains all filters. Active filters are counted in the sidebar header. Each filter is collapsible.

| Filter                       | What it does                                                                                                                                                 |
|------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Search**                   | Course name or code (e.g. `4IT101`)                                                                                                                          |
| **Syllabus search**          | Full-text search in course aims, learning outcomes, and syllabus text                                                                                        |
| **Faculties**                | Checkbox list; each faculty shows how many matching courses it has                                                                                           |
| **Study level**              | Bachelor's, Master's (follow-up), Doctoral, MBA, etc.                                                                                                        |
| **Language of instruction**  | Czech, English, German, Spanish, French, and others                                                                                                          |
| **Course groups**            | Faculty-specific, university-wide, field-specific (bachelor's / master's), minor specialization                                                              |
| **Category**                 | Compulsory, elective, language courses, state exams, physical education, etc.                                                                                |
| **ECTS credits**             | Filter to specific credit values                                                                                                                             |
| **Completion mode**          | Exam (zkouška), credit (zápočet), or defense (obhajoba)                                                                                                      |
| **Lecturers**                | Filter to courses taught by a specific lecturer                                                                                                              |
| **Time restriction**         | Include only courses that have a slot in a specific day + time range (see also [Drag-to-filter](#drag-to-filter))                                            |
| **Completed courses**        | Toggle to show or hide courses you've marked as already passed                                                                                               |
| **Hide conflicting courses** | Hides courses where *all* available time slots overlap with your current timetable selection. Courses with at least one non-conflicting slot remain visible. |

Filters are combined — all active filters apply at once. Use **Clear all** in the sidebar header to reset everything.

---

## Building your timetable

1. Click any course row to expand it
2. The expanded row shows all available **unit types** (lecture, exercise, seminar) and their time slots
3. Click a slot to add it to your timetable
    - If you already have a unit of the same type selected for this course, it is swapped out automatically
4. Repeat for each unit type the course requires (some courses have only lectures; others require both a lecture and an
   exercise)

Your timetable is saved in your browser's local storage — it survives page reloads, closing the tab, and restarting your
browser. The right-side panel shows all selected units grouped by course, with your total ECTS count.

---

## Conflict detection

Every course you add to the timetable gets a status. The status bar at the top of the page counts each category — click
a category to filter the course list to just those courses.

| Status              | Colour | Meaning                                                                                                                                            |
|---------------------|--------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| **Selected**        | Blue   | All required unit types chosen, no time or campus conflicts                                                                                        |
| **Incomplete**      | Amber  | You've selected at least one unit type but not all required ones — e.g. added the lecture but not the exercise yet                                 |
| **Campus conflict** | Orange | No time overlap, but the gap between classes on different VŠE campuses is under 40 minutes — not enough travel time between Žižkov and Jižní Město |
| **Conflict**        | Red    | Two selected courses overlap in time on the same day                                                                                               |

### Campus conflict detail

VŠE has two main campuses:

- **Žižkov** — rooms starting with RB, NB, IB, or SB
- **Jižní Město** — rooms starting with JM

If you select a course on one campus and another course on the other campus with less than 40 minutes between them, the
app flags a campus conflict. If a room's campus cannot be determined, no campus conflict is raised.

---

## Drag-to-filter

Available in **My Timetable** view.

1. Click and drag across any empty area of the grid to select a time range
2. A popover appears showing the day and time you selected
3. Click **Search courses** to confirm
4. The app switches to Course List view and filters to courses that have a slot in that time window

This is the fastest way to answer "what's available Tuesday morning between 9 and 11?"

To remove the time filter: open the **Time restriction** section in the filter sidebar and remove the entry, or click *
*Clear all**.

---

## Refresh from InSIS

Course data is scraped from InSIS on a schedule. For the most current information on a specific course:

1. Expand the course row
2. Click the **refresh icon** (circular arrow) next to the course name
3. The app fetches live data from InSIS and updates the course in place — slots, lecturers, room assignments, capacity,
   and all other details

**Rate limit:** once per 10 minutes per course. A countdown is shown if you try to refresh again too soon.

---

## Saved Schedules

Compare up to 5 different timetable alternatives without losing your work.

Access the schedule picker from the **My Timetable** view.

| Action           | What it does                                                      |
|------------------|-------------------------------------------------------------------|
| **Save current** | Saves a snapshot of your current timetable with a name you choose |
| **Duplicate**    | Copies an existing snapshot so you can experiment from it         |
| **Switch**       | Loads a saved snapshot as your working timetable                  |
| **Delete**       | Removes a saved snapshot                                          |

Use this to build "Plan A: all mornings" and "Plan B: Tuesday/Thursday only" side by side, then compare.

---

## Mark as completed

Courses you've already passed can be hidden from the list to reduce noise.

**From inside the app (any time):**

1. Expand the course row
2. Click **Mark as completed** at the bottom of the expanded row
3. The course is hidden from the list (unless you toggle "Show completed courses" in the filter sidebar)

**From the wizard:** Step 4 of the wizard lets you bulk-mark completed courses before you start browsing.

To unmark: expand the course (it's still visible if "Show completed courses" is on), and click **Mark as completed**
again to toggle it off.

---

## Language and theme

Both settings are in the top bar and are saved in your browser.

| Setting      | Options                                         |
|--------------|-------------------------------------------------|
| **Language** | Czech (čeština) · English                       |
| **Theme**    | Light · Dark · System (follows your OS setting) |
