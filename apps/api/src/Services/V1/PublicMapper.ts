import type { PublicCourse, PublicCourseDetail, PublicLecturerRef, PublicSlot, PublicStudyPlan, PublicUnit } from '@kreditozrouti/types'
import { minutesToTime } from '@kreditozrouti/core/domain'
import { CourseWithRelations, StudyPlan } from '@api/Database/types'

/** MySQL datetimes come back as Date from mysql2 but are typed loosely, so accept both. */
function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null
	return (value instanceof Date ? value : new Date(value)).toISOString()
}

function time(minutes: number | null): string | null {
	return minutes === null ? null : minutesToTime(minutes)
}

function splitPipe(raw: string | null): string[] {
	return raw ? raw.split('|').filter(Boolean) : []
}

type Unit = CourseWithRelations['units'][number]
type Slot = Unit['slots'][number]

/**
 * Maps internal rows to the public contract. This is the only place that knows both shapes: the internal
 * schema can change as long as this mapping keeps producing the documented DTOs.
 */
export const PublicMapper = {
	slot(slot: Slot): PublicSlot {
		return {
			// getSlotType / INSIS_DAY_NORM already normalised these in CourseQueryService, the row types are just wider.
			type: slot.type as PublicSlot['type'],
			frequency: slot.frequency,
			day: slot.day as PublicSlot['day'],
			date: slot.date,
			time_from: time(slot.time_from),
			time_to: time(slot.time_to),
			location: slot.location
		}
	},

	unit(unit: Unit, includeLecturers: boolean): PublicUnit {
		return {
			id: unit.id,
			...(includeLecturers ? { lecturer: unit.lecturer } : {}),
			capacity: unit.capacity,
			note: unit.note,
			slots: unit.slots.map(slot => PublicMapper.slot(slot))
		}
	},

	course(course: CourseWithRelations, lecturers: PublicLecturerRef[] | undefined): PublicCourse {
		return {
			id: course.id,
			ident: course.ident,
			title: course.title,
			title_cs: course.title_cs,
			title_en: course.title_en,
			ects: course.ects,
			faculty_id: course.faculty_id,
			year: course.year,
			semester: course.semester,
			level: course.level,
			year_of_study: course.year_of_study,
			languages: splitPipe(course.languages),
			mode_of_delivery: course.mode_of_delivery,
			mode_of_completion: course.mode_of_completion,
			url: course.url,
			...(lecturers ? { lecturers } : {}),
			units: course.units.map(unit => PublicMapper.unit(unit, lecturers !== undefined)),
			last_scraped_at: iso(course.last_scraped_at)
		}
	},

	courseDetail(course: CourseWithRelations, lecturers: PublicLecturerRef[] | undefined): PublicCourseDetail {
		return {
			...PublicMapper.course(course, lecturers),
			prerequisites: course.prerequisites,
			prerequisites_en: course.prerequisites_en,
			aims_of_the_course: course.aims_of_the_course,
			aims_of_the_course_en: course.aims_of_the_course_en,
			learning_outcomes: course.learning_outcomes,
			learning_outcomes_en: course.learning_outcomes_en,
			course_contents: course.course_contents,
			course_contents_en: course.course_contents_en,
			special_requirements: course.special_requirements,
			special_requirements_en: course.special_requirements_en,
			literature_required: course.literature_required,
			literature_required_en: course.literature_required_en,
			literature_recommended: course.literature_recommended,
			literature_recommended_en: course.literature_recommended_en,
			assessments: course.assessments.map(a => ({ method: a.method, method_en: a.method_en, weight: a.weight })),
			prerequisite_idents: {
				blocked_by: course.blocked_by_course_idents ?? [],
				excluded_after: course.excluded_after_course_idents ?? [],
				concurrent_exclusion: course.concurrent_exclusion_idents ?? [],
				recommended_before: course.recommended_before_course_idents ?? []
			}
		}
	},

	studyPlan(plan: StudyPlan): PublicStudyPlan {
		return {
			id: plan.id,
			ident: plan.ident,
			title: plan.title,
			faculty_id: plan.faculty_id,
			year: plan.year,
			semester: plan.semester,
			level: plan.level,
			mode_of_study: plan.mode_of_study,
			study_length: plan.study_length
		}
	}
}
