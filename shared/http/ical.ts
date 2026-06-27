import type { Day } from '../domain/constants.js'
import type { CourseUnitType } from '../domain/insis.js'

// Minimal unit shape stored in Redis for iCal generation.
export interface ICalUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: Day
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
}

export interface ICalConfig {
	slotId: number
	title: string
	location: string
	description: string
}

export interface ICalCreateRequest {
	units: ICalUnit[]
	configs: ICalConfig[]
	semesterStart: string // YYYY-MM-DD
	semesterEnd: string // YYYY-MM-DD
}

export interface ICalCreateResponse {
	id: string
}
