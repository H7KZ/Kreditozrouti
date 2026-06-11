import type { InSISDay, InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from '@shared/domain/insis'
import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ExcludeMethods<T> = { [K in keyof T as T[K] extends Function ? never : K]: T[K] }

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------

/**
 * Database schema for Faculties.
 */
export class FacultyTable {
	static readonly _table = 'insis_faculties' as const

	id!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	title!: string | null
	is_schedule_publicly_visible!: ColumnType<boolean, boolean | undefined, boolean>
}

export type Faculty<C = void, SP = void> = Selectable<FacultyTable> &
	(C extends void ? unknown : { courses: C[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewFaculty = Insertable<Omit<ExcludeMethods<FacultyTable>, 'id' | 'created_at' | 'updated_at'>>

export type FacultyWithRelations = Faculty<Course, StudyPlan>

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

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
	title_cs!: string | null
	title_en!: string | null
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

	/** Pipe-delimited list of course guarantors. */
	guarantors!: string | null

	/** ISO date string of last InSIS modification (YYYY-MM-DD). */
	last_modified_date!: string | null

	last_modified_by!: string | null

	/** JSON array of { activity: string, hours: number } study load entries. */
	study_load!: string | null

	literature_required!: string | null
	literature_recommended!: string | null

	last_scraped_at!: ColumnType<Date, string | undefined, string | undefined> | null

	content_hash!: string | null
}

export type Course<F = void, U = void, A = void, SP = void> = Selectable<CourseTable> &
	(F extends void ? unknown : { faculty: F | null }) &
	(U extends void ? unknown : { units: U[] }) &
	(A extends void ? unknown : { assessments: A[] }) &
	(SP extends void ? unknown : { study_plans: SP[] })
export type NewCourse = Insertable<Omit<ExcludeMethods<CourseTable>, 'created_at' | 'updated_at'>>

export type CourseWithRelations = Course<Faculty, CourseUnit<void, CourseUnitSlot>, CourseAssessment, StudyPlanCourse>

// ---------------------------------------------------------------------------
// CourseAssessment
// ---------------------------------------------------------------------------

/**
 * Assessment methods required to complete a course.
 */
export class CourseAssessmentTable {
	static readonly _table = 'insis_courses_assessments' as const

	id!: Generated<number>

	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** Description of the method (e.g., "Final Exam"). */
	method!: string | null

	/** Percentage weight in the final grade. */
	weight!: number | null
}

export type CourseAssessment<C = void> = Selectable<CourseAssessmentTable> & (C extends void ? unknown : { course: C | null })
export type NewCourseAssessment = Insertable<Omit<ExcludeMethods<CourseAssessmentTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseAssessmentWithRelations = CourseAssessment<Course>

// ---------------------------------------------------------------------------
// CourseUnit
// ---------------------------------------------------------------------------

/**
 * Represents a specific teaching group or instance of a course.
 */
export class CourseUnitTable {
	static readonly _table = 'insis_courses_units' as const

	id!: Generated<number>

	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	lecturer!: string | null
	capacity!: number | null
	note!: string | null
}

export type CourseUnit<C = void, S = void> = Selectable<CourseUnitTable> &
	(C extends void ? unknown : { course: C | null }) &
	(S extends void ? unknown : { slots: S[] })
export type NewCourseUnit = Insertable<Omit<ExcludeMethods<CourseUnitTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseUnitWithRelations = CourseUnit<Course, CourseUnitSlot<CourseUnit<void, void>>>

// ---------------------------------------------------------------------------
// CourseUnitSlot
// ---------------------------------------------------------------------------

/**
 * Specific scheduled time and location for a timetable unit.
 */
export class CourseUnitSlotTable {
	static readonly _table = 'insis_courses_units_slots' as const

	id!: Generated<number>

	unit_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** Action type (e.g., Lecture, Seminar). */
	type!: string | null

	frequency!: 'weekly' | 'single' | null

	/** Date string for single-occurrence slots. */
	date!: string | null

	/** Day of the week for recurring slots. */
	day!: InSISDay | null

	/** Start time in minutes from midnight for easier calculation. */
	time_from!: number | null
	/** End time in minutes from midnight. */
	time_to!: number | null

	location!: string | null
}

export type CourseUnitSlot<C = void, U = void> = Selectable<CourseUnitSlotTable> &
	(C extends void ? unknown : { course: C | null }) &
	(U extends void ? unknown : { unit: U | null })
export type NewCourseUnitSlot = Insertable<Omit<ExcludeMethods<CourseUnitSlotTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseUnitSlotWithRelations = CourseUnitSlot<Course, CourseUnit<void, CourseUnitSlot<void>>>

// ---------------------------------------------------------------------------
// StudyPlan
// ---------------------------------------------------------------------------

/**
 * Database schema for Study Plans (Curriculums).
 */
export class StudyPlanTable {
	static readonly _table = 'insis_study_plans' as const

	id!: Generated<number>

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string

	/** Plan identifier (e.g., "P-AIN"). */
	ident!: string | null
	title!: string | null

	/** Associated semester for the study plan. */
	semester!: InSISSemester | null

	/** Semester validity (e.g., "2025"). */
	year!: number | null

	level!: string | null
	mode_of_study!: string | null
	study_length!: string | null
}

export type StudyPlan<F = void, C = void> = Selectable<StudyPlanTable> &
	(F extends void ? unknown : { faculty: F | null }) &
	(C extends void ? unknown : { courses: C[] })
export type NewStudyPlan = Insertable<Omit<ExcludeMethods<StudyPlanTable>, 'id' | 'created_at' | 'updated_at'>>

export type StudyPlanWithRelations = StudyPlan<Faculty, StudyPlanCourse>

// ---------------------------------------------------------------------------
// StudyPlanCourse
// ---------------------------------------------------------------------------

/**
 * Association between Study Plans and Courses.
 * Defines the role of a course within a specific plan (e.g., compulsory, elective).
 */
export class StudyPlanCourseTable {
	static readonly _table = 'insis_study_plans_courses' as const

	id!: Generated<number>

	study_plan_id!: number
	course_id!: number

	/** Course identifier (e.g., "4IT101") — used as the natural key alongside study_plan_id. */
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourse<SP = void, C = void> = Selectable<StudyPlanCourseTable> &
	(SP extends void ? unknown : { study_plan: SP | null }) &
	(C extends void ? unknown : { course: C | null })
export type NewStudyPlanCourse = Insertable<Omit<ExcludeMethods<StudyPlanCourseTable>, 'id' | 'created_at' | 'updated_at'>>

export type StudyPlanCourseWithRelations = StudyPlanCourse<StudyPlanTable, null>

// ---------------------------------------------------------------------------
// StudyPlanCourseIdent
// ---------------------------------------------------------------------------

/**
 * Authoritative list of course idents per study plan edition.
 * Owned by the study plan scraper — never contains course_id.
 */
export class StudyPlanCourseIdentTable {
	static readonly _table = 'study_plans_course_idents' as const

	id!: Generated<number>

	study_plan_id!: number
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourseIdent<SP = void> = Selectable<StudyPlanCourseIdentTable> &
	(SP extends void ? unknown : { study_plan: SP | null })
export type NewStudyPlanCourseIdent = Insertable<Omit<ExcludeMethods<StudyPlanCourseIdentTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// AcademicPeriod
// ---------------------------------------------------------------------------

export class AcademicPeriodTable {
	static readonly _table = 'insis_academic_periods' as const

	id!: Generated<number>

	insis_period_id!: number
	faculty_id!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	semester!: InSISSemester | null
	year!: number
	level!: string | null
	starts_at!: ColumnType<Date, string, string>
	ends_at!: ColumnType<Date, string, string>
	last_scraped_at!: ColumnType<Date, string | undefined, string | undefined> | null
}

export type AcademicPeriod = Selectable<AcademicPeriodTable>
export type NewAcademicPeriod = Insertable<Omit<ExcludeMethods<AcademicPeriodTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// AcademicScheduleEvent
// ---------------------------------------------------------------------------

export class AcademicScheduleEventTable {
	static readonly _table = 'insis_academic_schedule_events' as const

	id!: Generated<number>

	period_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	title!: string
	starts_at!: ColumnType<Date, string | null, string | null> | null
	ends_at!: ColumnType<Date, string | null, string | null> | null
}

export type AcademicScheduleEvent = Selectable<AcademicScheduleEventTable>
export type NewAcademicScheduleEvent = Insertable<Omit<ExcludeMethods<AcademicScheduleEventTable>, 'id' | 'created_at' | 'updated_at'>>

// ---------------------------------------------------------------------------
// Database mapping
// ---------------------------------------------------------------------------

type AllTableClasses =
	| typeof CourseTable
	| typeof CourseAssessmentTable
	| typeof CourseUnitTable
	| typeof CourseUnitSlotTable
	| typeof StudyPlanTable
	| typeof StudyPlanCourseTable
	| typeof StudyPlanCourseIdentTable
	| typeof FacultyTable
	| typeof AcademicPeriodTable
	| typeof AcademicScheduleEventTable

/**
 * Master mapping of table names to Kysely table interfaces.
 */
export type Database = {
	[T in AllTableClasses as T['_table']]: InstanceType<T>
}
