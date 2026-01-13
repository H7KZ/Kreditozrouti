import InSISSemester from '@scraper/Types/InSISSemester'
import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

/**
 * Database schema for InSIS Courses.
 */
export class CourseTable {
	static readonly _table = 'insis_courses' as const

	id!: number

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** External source URL. */
	url!: string

	/** Unique course code (e.g., 4IT101). */
	ident!: string

	title!: string | null
	czech_title!: string | null
	ects!: number | null

	/** Delivery format (e.g., in-person, remote). */
	mode_of_delivery!: string | null

	/** Completion requirements (e.g., credit, exam). */
	mode_of_completion!: string | null

	/** Comma-separated list of instruction languages. */
	languages!: string | null

	/** Academic level (e.g., Bachelor, Master). */
	level!: string | null

	/** Recommended year of study in the curriculum. */
	year_of_study!: number | null

	/** Teaching semester (Winter/Summer). */
	semester!: InSISSemester | null

	year!: number | null

	lecturers!: string | null
	prerequisites!: string | null
	recommended_programmes!: string | null
	required_work_experience!: string | null

	/** Educational goals. */
	aims_of_the_course!: string | null

	/** Acquired knowledge and skills. */
	learning_outcomes!: string | null

	/** Detailed syllabus. */
	course_contents!: string | null

	special_requirements!: string | null
	literature!: string | null
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<Omit<CourseTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Assessment methods required to complete a course.
 */
export class CourseAssessmentMethodTable {
	static readonly _table = 'insis_courses_assessment_methods' as const

	id!: Generated<number>
	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** Description of the method (e.g., "Final Exam"). */
	method!: string | null

	/** Percentage weight in the final grade. */
	weight!: number | null
}

export type CourseAssessmentMethod = Selectable<CourseAssessmentMethodTable>
export type NewCourseAssessmentMethod = Insertable<Omit<CourseAssessmentMethodTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Represents a specific teaching group or instance of a course.
 */
export class CourseTimetableUnitTable {
	static readonly _table = 'insis_courses_timetable_units' as const

	id!: Generated<number>
	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	lecturer!: string | null
	capacity!: number | null
	note!: string | null
}

export type CourseTimetableUnit = Selectable<CourseTimetableUnitTable>
export type NewCourseTimetableUnit = Insertable<Omit<CourseTimetableUnitTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Specific scheduled time and location for a timetable unit.
 */
export class CourseTimetableSlotTable {
	static readonly _table = 'insis_courses_timetable_slots' as const

	id!: Generated<number>
	timetable_unit_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** Action type (e.g., Lecture, Seminar). */
	type!: string | null

	frequency!: 'weekly' | 'single' | null

	/** Date string for single-occurrence slots. */
	date!: string | null

	/** Day of the week for recurring slots. */
	day!: string | null

	time_from!: string | null
	time_to!: string | null

	/** Start time in minutes from midnight for easier calculation. */
	time_from_minutes!: number | null

	/** End time in minutes from midnight. */
	time_to_minutes!: number | null

	location!: string | null
}

export type CourseTimetableSlot = Selectable<CourseTimetableSlotTable>
export type NewCourseTimetableSlot = Insertable<Omit<CourseTimetableSlotTable, 'id' | 'created_at' | 'updated_at'>>
