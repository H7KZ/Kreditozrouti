// Re-export API types
export type { default as CoursesRequest } from '@api/Controllers/Kreditozrouti/types/CoursesRequest'
export type { default as CoursesResponse } from '@api/Controllers/Kreditozrouti/types/CoursesResponse'
export type { default as StudyPlansRequest } from '@api/Controllers/Kreditozrouti/types/StudyPlansRequest'
export type { default as StudyPlansResponse } from '@api/Controllers/Kreditozrouti/types/StudyPlansResponse'
export type { Course, StudyPlan } from '@api/Database/types'
export type { default as CoursesFilter } from '@api/Interfaces/CoursesFilter'
export type { default as StudyPlansFilter } from '@api/Interfaces/StudyPlansFilter'
import type { Course } from '@api/Database/types'

// Frontend-specific types

/** Scheduled course in user's timetable */
export interface ScheduledCourse {
	course: Course
	timeSlotIndex: number
	color: string
}

/** Day configuration for timetable */
export interface TimetableDay {
	key: string
	label: string
	shortLabel: string
}

/** Filter state for the UI (mirrors CoursesFilter but with guaranteed arrays) */
export interface CourseFilterState {
	semester: string[]
	year: number[]
	ident: string
	lecturer: string[]
	day: string[]
	language: string[]
	level: string[]
	faculty: string[]
	study_plan_id: number | null
	time_from: number
	time_to: number
}
