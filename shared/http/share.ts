import type { CourseUnitType, InSISDay } from '../domain/insis.js'

// Minimal unit shape stored in Redis — mirrors SelectedCourseUnit from client.
// Defined here so the API can validate the payload without importing client code.
export interface ShareableUnit {
	courseId: number
	courseIdent: string
	courseTitle: string
	courseTitleCs: string
	courseTitleEn: string
	unitId: number
	unitType: CourseUnitType
	slotId: number
	day?: InSISDay
	date?: string
	timeFrom: number
	timeTo: number
	location?: string
	lecturer?: string
	ects?: number
	snapshotAvailableTypes?: CourseUnitType[]
}

export interface ShareCreateRequest {
	units: ShareableUnit[]
}

export interface ShareCreateResponse {
	id: string
}

export interface ShareGetResponse {
	units: ShareableUnit[]
}
