import type { InSISDay, InSISSemester, InSISStudyPlanCourseCategory, InSISStudyPlanCourseGroup } from './domain.js'
import { ColumnType, Generated, Insertable, Selectable } from 'kysely'

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ExcludeMethods<T> = { [K in keyof T as T[K] extends Function ? never : K]: T[K] }

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------

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

export class CourseTable {
	static readonly _table = 'insis_courses' as const

	id!: number

	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string
	ident!: string
	title!: string | null
	title_cs!: string | null
	title_en!: string | null
	ects!: number | null
	mode_of_delivery!: string | null
	mode_of_completion!: string | null
	languages!: string | null
	level!: string | null
	year_of_study!: number | null
	semester!: InSISSemester | null
	year!: number | null
	lecturers!: string | null
	prerequisites!: string | null
	recommended_programmes!: string | null
	required_work_experience!: string | null
	blocked_by_course_idents!: ColumnType<string[] | null, string | null, string | null>
	excluded_after_course_idents!: ColumnType<string[] | null, string | null, string | null>
	concurrent_exclusion_idents!: ColumnType<string[] | null, string | null, string | null>
	recommended_before_course_idents!: ColumnType<string[] | null, string | null, string | null>
	aims_of_the_course!: string | null
	learning_outcomes!: string | null
	course_contents!: string | null
	special_requirements!: string | null
	guarantors!: string | null
	last_modified_date!: string | null
	last_modified_by!: string | null
	study_load!: string | null
	literature_required!: string | null
	literature_recommended!: string | null
	aims_of_the_course_en!: string | null
	learning_outcomes_en!: string | null
	course_contents_en!: string | null
	special_requirements_en!: string | null
	literature_required_en!: string | null
	literature_recommended_en!: string | null
	prerequisites_en!: string | null
	recommended_programmes_en!: string | null
	required_work_experience_en!: string | null
	last_scraped_at!: ColumnType<Date, string | undefined, string | undefined> | null
	content_hash_cs!: string | null
	content_hash_en!: string | null
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

export class CourseAssessmentTable {
	static readonly _table = 'insis_courses_assessments' as const

	id!: Generated<number>
	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	method!: string | null
	method_en!: string | null
	weight!: number | null
}

export type CourseAssessment<C = void> = Selectable<CourseAssessmentTable> & (C extends void ? unknown : { course: C | null })
export type NewCourseAssessment = Insertable<Omit<ExcludeMethods<CourseAssessmentTable>, 'id' | 'created_at' | 'updated_at'>>

export type CourseAssessmentWithRelations = CourseAssessment<Course>

// ---------------------------------------------------------------------------
// CourseUnit
// ---------------------------------------------------------------------------

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

export class CourseUnitSlotTable {
	static readonly _table = 'insis_courses_units_slots' as const

	id!: Generated<number>
	unit_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	type!: string | null
	frequency!: 'weekly' | 'single' | null
	date!: string | null
	day!: InSISDay | null
	time_from!: number | null
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

export class StudyPlanTable {
	static readonly _table = 'insis_study_plans' as const

	id!: Generated<number>
	faculty_id!: string | null

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	url!: string
	ident!: string | null
	title!: string | null
	semester!: InSISSemester | null
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

export class StudyPlanCourseTable {
	static readonly _table = 'insis_study_plans_courses' as const

	id!: Generated<number>
	study_plan_id!: number
	course_id!: number
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

export class StudyPlanCourseIdentTable {
	static readonly _table = 'insis_study_plans_course_idents' as const

	id!: Generated<number>
	study_plan_id!: number
	course_ident!: string

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	group!: InSISStudyPlanCourseGroup
	category!: InSISStudyPlanCourseCategory
}

export type StudyPlanCourseIdent<SP = void> = Selectable<StudyPlanCourseIdentTable> & (SP extends void ? unknown : { study_plan: SP | null })
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

export type Database = {
	[T in AllTableClasses as T['_table']]: InstanceType<T>
}
