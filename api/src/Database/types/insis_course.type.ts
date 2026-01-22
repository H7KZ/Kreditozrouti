import { mysql } from '@api/clients';
import { ExcludeMethods } from "@api/Database/types/index";
import { Faculty, FacultyTable } from '@api/Database/types/insis_faculty.type';
import { StudyPlanCourse, StudyPlanCourseTable } from '@api/Database/types/insis_study_plan.type';
import InSISDay from '@scraper/Types/InSISDay';
import InSISSemester from '@scraper/Types/InSISSemester';
import { ColumnType, Insertable, Selectable } from 'kysely';


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

	async getFaculty(): Promise<Faculty | null> {
		if (!this.faculty_id) return null

		const query = mysql.selectFrom(FacultyTable._table).selectAll().where('id', '=', this.faculty_id).limit(1)
		const faculty = await query.executeTakeFirst()
		return faculty ?? null
	}

	async getUnits(): Promise<CourseUnit[]> {
		const query = mysql.selectFrom(CourseUnitTable._table).selectAll().where('course_id', '=', this.id)
		return await query.execute()
	}

	async getAssessments(): Promise<CourseAssessment[]> {
		const query = mysql.selectFrom(CourseAssessmentTable._table).selectAll().where('course_id', '=', this.id)
		return await query.execute()
	}

	async getStudyPlans(): Promise<StudyPlanCourse[]> {
		const query = mysql.selectFrom(StudyPlanCourseTable._table).selectAll().where('course_id', '=', this.id)
		return await query.execute()
	}
}

export type Course<F = void, U = void, A = void, SP = void> = Selectable<CourseTable> &
	(F extends void ? unknown : { faculty: Partial<F> | null }) &
	(U extends void ? unknown : { units: Partial<U>[] }) &
	(A extends void ? unknown : { assessments: Partial<A>[] }) &
	(SP extends void ? unknown : { study_plans: Partial<SP>[] })
export type NewCourse = Insertable<Omit<ExcludeMethods<CourseTable>, 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Assessment methods required to complete a course.
 */
export class CourseAssessmentTable {
	static readonly _table = 'insis_courses_assessments' as const

	id!: number // Generated<number>

	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	/** Description of the method (e.g., "Final Exam"). */
	method!: string | null

	/** Percentage weight in the final grade. */
	weight!: number | null

	async getCourse(): Promise<Course | null> {
		const query = mysql.selectFrom(CourseTable._table).selectAll().where('id', '=', this.course_id).limit(1)
		const course = await query.executeTakeFirst()
		return course ?? null
	}
}

export type CourseAssessment<C = void> = Selectable<CourseAssessmentTable> & (C extends void ? unknown : { course: Partial<C> | null })
export type NewCourseAssessment = Insertable<Omit<ExcludeMethods<CourseAssessmentTable>, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Represents a specific teaching group or instance of a course.
 */
export class CourseUnitTable {
	static readonly _table = 'insis_courses_units' as const

	id!: number // Generated<number>

	course_id!: number

	created_at!: ColumnType<Date, string | undefined, never>
	updated_at!: ColumnType<Date, string | undefined, string | undefined>

	lecturer!: string | null
	capacity!: number | null
	note!: string | null

	async getCourse(): Promise<Course | null> {
		const query = mysql.selectFrom(CourseTable._table).selectAll().where('id', '=', this.course_id).limit(1)
		const course = await query.executeTakeFirst()
		return course ?? null
	}

	async getSlots(): Promise<CourseUnitSlot[]> {
		const query = mysql.selectFrom(CourseUnitSlotTable._table).selectAll().where('unit_id', '=', this.id)
		return await query.execute()
	}
}

export type CourseUnit<C = void, S = void> = Selectable<CourseUnitTable> &
	(C extends void ? unknown : { course: Partial<C> | null }) &
	(S extends void ? unknown : { slots: Partial<S>[] })
export type NewCourseUnit = Insertable<Omit<ExcludeMethods<CourseUnitTable>, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Specific scheduled time and location for a timetable unit.
 */
export class CourseUnitSlotTable {
	static readonly _table = 'insis_courses_units_slots' as const

	id!: number // Generated<number>

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

	async getUnit(): Promise<CourseUnit | null> {
		const query = mysql.selectFrom(CourseUnitTable._table).selectAll().where('id', '=', this.unit_id).limit(1)
		const unit = await query.executeTakeFirst()
		return unit ?? null
	}
}

export type CourseUnitSlot<U = void> = Selectable<CourseUnitSlotTable> & (U extends void ? unknown : { unit: Partial<U> | null })
export type NewCourseUnitSlot = Insertable<Omit<ExcludeMethods<CourseUnitSlotTable>, 'id' | 'created_at' | 'updated_at'>>
