/**
 * Frontend types for the Study Plans API
 */

import type { Course, FacetItem, Faculty, InSISSemester } from './courses'

export interface StudyPlan {
	id: number
	faculty_id: string | null
	url: string
	ident: string | null
	title: string | null
	semester: InSISSemester | null
	year: number | null
	level: string | null
	mode_of_study: string | null
	study_length: string | null
	created_at: string
	updated_at: string
	faculty: Partial<Faculty> | null
	courses?: Partial<Course>[]
}

export interface StudyPlansFilter {
	id?: number | number[]
	faculty_id?: string | string[]
	semester?: InSISSemester
	year?: number
	level?: string | string[]
	mode_of_study?: string | string[]
	study_length?: string | string[]
	search?: string
	limit?: number
	offset?: number
}

export interface StudyPlansFacets {
	faculties: FacetItem[]
	levels: FacetItem[]
	semesters: FacetItem[]
	years: FacetItem[]
	modes_of_studies: FacetItem[]
	study_lengths: FacetItem[]
}

export interface StudyPlansResponse {
	data: StudyPlan[]
	facets: StudyPlansFacets
	meta: {
		limit: number
		offset: number
		count: number
		total: number
	}
}
