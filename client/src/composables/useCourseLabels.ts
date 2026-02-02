import type { Course, CourseUnitSlot, CourseWithRelations } from '@api/Database/types'
import { i18n } from '@client/index.ts'
import { CourseUnitType, SelectedCourseUnit } from '@client/types'
import type InSISDay from '@scraper/Types/InSISDay'

/**
 * Course labels composable.
 *
 * @example
 * ```ts
 * const {
 *   getCompletionLabel,
 *   getFacultyLabel,
 *   getLanguageLabel,
 *   getUnitTypeLabel,
 * } = useCourseLabels()
 *
 * const label = getCompletionLabel('zkouška') // "Exam"
 * ```
 */
export function useCourseLabels() {
	const t = (key: string, params?: Record<string, unknown>) => i18n.global.t(key, params ?? {})
	const te = (key: string) => i18n.global.te(key)
	const locale = i18n.global.locale

	/**
	 * Get translated label with fallback to raw value.
	 *
	 * @param prefix - Translation key prefix (e.g., 'courseModesOfCompletion')
	 * @param value - Value to translate
	 * @returns Translated label or original value
	 */
	function getLabel(prefix: string, value: string): string {
		const key = `${prefix}.${value}`
		return te(key) ? t(key) : value
	}

	/**
	 * Get semester label.
	 */
	function getSemesterLabel(value: string): string {
		return getLabel('semesters', value)
	}

	/**
	 * Get mode of completion label.
	 */
	function getCompletionLabel(value: string): string {
		return getLabel('courseModesOfCompletion', value)
	}

	/**
	 * Get faculty name label.
	 */
	function getFacultyLabel(value: string): string {
		return getLabel('faculties', value)
	}

	/**
	 * Get language label.
	 */
	function getLanguageLabel(value: string): string {
		return getLabel('courseLanguages', value)
	}

	/**
	 * Get multiple language labels from pipe-separated string.
	 */
	function getLanguagesLabel(languages: string | null | undefined): string {
		if (!languages) return '-'
		return languages
			.split('|')
			.map((lang) => getLanguageLabel(lang.trim()))
			.join(', ')
	}

	/**
	 * Get course category label (compulsory, elective, etc.).
	 */
	function getCategoryLabel(value: string): string {
		return getLabel('courseCategories', value)
	}

	/**
	 * Get course group label.
	 */
	function getGroupLabel(value: string): string {
		return getLabel('courseGroups', value)
	}

	/**
	 * Get study level label.
	 */
	function getLevelLabel(value: string): string {
		return getLabel('studyLevels', value.toLowerCase())
	}

	/**
	 * Get course level label.
	 */
	function getCourseLevelLabel(value: string): string {
		return getLabel('courseLevels', value)
	}

	/**
	 * Get unit type label (full form: "Lecture", "Exercise", "Seminar").
	 */
	function getUnitTypeLabel(type: CourseUnitType): string {
		return getLabel('unitTypes', type)
	}

	/**
	 * Get short unit type label (abbreviated: "Př", "Cv", "Se").
	 */
	function getShortUnitTypeLabel(type: CourseUnitType): string {
		return getLabel('unitTypesShort', type)
	}

	/**
	 * Get unit type label in accusative form (for error messages).
	 */
	function getUnitTypeAccusativeLabel(type: CourseUnitType): string {
		return getLabel('unitTypesAccusative', type)
	}

	/**
	 * Get combined label for a group of unit types.
	 *
	 * @param types - Array of unit types
	 * @returns Combined label like "Lecture & Exercise"
	 */
	function getUnitTypesGroupLabel(types: CourseUnitType[]): string {
		return types.map((type) => getUnitTypeLabel(type)).join(' & ')
	}

	/**
	 * Get day label (full form: "Monday", "Tuesday", etc.).
	 */
	function getDayLabel(day: InSISDay): string {
		return getLabel('days', day)
	}

	/**
	 * Get short day label (abbreviated: "Po", "Út", etc.).
	 */
	function getShortDayLabel(day: InSISDay): string {
		return getLabel('daysShort', day)
	}

	/**
	 * Get localized course title based on current locale.
	 *
	 * @param course - Course object
	 * @returns Title in current locale with fallbacks
	 */
	function getCourseTitle(course: CourseWithRelations | Course): string {
		switch (locale.value) {
			case 'cs':
				return course.title_cs ?? course.title ?? ''
			case 'en':
				return course.title_en ?? course.title ?? ''
			default:
				return course.title ?? ''
		}
	}

	/**
	 * Get localized course unit title based on current locale.
	 *
	 * @param unit - Course unit object
	 * @returns Title in current locale with fallbacks
	 */
	function getUnitCourseTitle(unit: SelectedCourseUnit): string {
		switch (locale.value) {
			case 'cs':
				return unit.courseTitleCs ?? unit.courseTitle ?? ''
			case 'en':
				return unit.courseTitleEn ?? unit.courseTitle ?? ''
			default:
				return unit.courseTitle
		}
	}

	/**
	 * Get slot type from a course unit slot.
	 * Determines if the slot is a lecture, exercise, or seminar
	 * based on the slot's type field.
	 */
	function getSlotType(slot: CourseUnitSlot): CourseUnitType {
		const slotType = slot.type?.toLowerCase() || ''

		const hasLecture = slotType.includes('přednáška') || slotType.includes('lecture')
		const hasExercise = slotType.includes('cvičení') || slotType.includes('exercise')
		const hasSeminar = slotType.includes('seminář') || slotType.includes('seminar')

		if (hasLecture) return 'lecture'
		if (hasExercise) return 'exercise'
		if (hasSeminar) return 'seminar'

		return 'lecture' // Default to lecture
	}

	/**
	 * Get color class for a unit type.
	 */
	function getUnitTypeColorClass(type: CourseUnitType): string {
		const colors: Record<CourseUnitType, string> = {
			lecture: 'bg-[var(--insis-block-lecture)]',
			exercise: 'bg-[var(--insis-block-exercise)]',
			seminar: 'bg-[var(--insis-block-seminar)]',
		}
		return colors[type] || colors.lecture
	}

	/**
	 * Get badge class for a course category.
	 */
	function getCategoryBadgeClass(category: string): string {
		switch (category) {
			case 'compulsory':
				return 'insis-badge-compulsory'
			case 'elective':
				return 'insis-badge-elective'
			default:
				return 'insis-badge-other'
		}
	}

	return {
		// Generic helper
		getLabel,

		// Course attributes
		getSemesterLabel,
		getCompletionLabel,
		getFacultyLabel,
		getLanguageLabel,
		getLanguagesLabel,
		getCategoryLabel,
		getGroupLabel,
		getLevelLabel,
		getCourseLevelLabel,
		getCourseTitle,
		getUnitCourseTitle,

		// Unit types
		getUnitTypeLabel,
		getShortUnitTypeLabel,
		getUnitTypeAccusativeLabel,
		getUnitTypesGroupLabel,
		getSlotType,
		getUnitTypeColorClass,
		getCategoryBadgeClass,

		// Days
		getDayLabel,
		getShortDayLabel,
	}
}
