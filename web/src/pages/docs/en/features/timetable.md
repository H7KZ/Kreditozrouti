---
title: Timetable
section: Features
order: 2
---

# Timetable

The main page has **Course List**, **My Timetable**, and **Optimizer** views. The timetable grid shows Monday to Friday from 07:30 to 20:00. Your selections are saved in this browser.

## Build a schedule

1. In **Course List**, expand a course to see details, prerequisites, and available teaching slots.
2. Select a lecture, exercise, or seminar slot. If the course needs more than one unit type, select one of each.
3. To change a time, select another slot of the same type. The app replaces your previous selection.
4. Open **My Timetable** to review the week. The selected-course panel shows your units and total ECTS.

Click a timetable block to inspect its time, room, lecturer, and course details. From that panel you can search for courses in the same time window or remove the course.

## Conflicts and incomplete courses

| Status | Meaning |
| --- | --- |
| **Conflict** | Selected slots overlap in time. |
| **Campus conflict** | Less than 40 minutes separate classes at different known VŠE campuses. |
| **Incomplete** | A required unit type, such as an exercise, has not been selected. |
| **Selected** | No detected issue. |

The app recognizes Žižkov rooms starting `RB`, `NB`, `IB`, or `SB`, and Jižní Město rooms starting `JM`. It cannot warn about a campus transfer when a room's campus is unknown. Check the final timetable in InSIS before enrolling.

## Drag-to-filter

In **My Timetable**, drag across an empty part of the grid and confirm **Search courses**. The app switches to **Course List** and shows courses with a slot in that day and time range. Remove the window under **Time restriction** in the sidebar or use **Clear all**.

## Saved schedules

Save up to five named schedules from **My Timetable**. You can switch between them, duplicate one to try a variation, or delete one. Schedules are stored in this browser.

## Share and export

- **Share** creates a short link to a read-only snapshot. Anyone with the link can view it and save a copy to their own browser. Treat the link as access to the snapshot.
- **Calendar export** opens a dialog to review events and semester dates, then downloads an `.ics` file or creates a calendar subscription link.
- **Image export** saves a picture of the timetable.

## Refresh course data

Expand a course and use its refresh icon to request current information from InSIS. The course updates in place when the request finishes. A per-course cooldown limits repeated refreshes; the UI shows the remaining time.

## Prerequisites

When InSIS provides prerequisite data, the expanded course row groups it as required, incompatible after completion, incompatible in the same semester, or recommended. Click a linked course code to search for it. Filtering based on completed courses also uses applicable prerequisite information.

## Mark as completed

Use **Mark as completed** in an expanded course row, or mark several courses in step 4 of the setup wizard. Completed courses can be hidden from the list. Turn on **Show completed courses** to find and unmark one.
