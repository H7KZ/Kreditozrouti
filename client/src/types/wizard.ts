import { Course, StudyPlanWithRelations } from '@api/Database/types'
import FacetItem from '@api/Interfaces/FacetItem.ts'
import InSISSemester from '@scraper/Types/InSISSemester.ts'

/** Represents a selected study plan with its metadata */
export interface SelectedStudyPlan {
	id: number
	ident: string | null
	title: string | null
}

export interface PersistedWizardState {
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	studyPlanId: number | null
	studyPlanIdent: string | null
	studyPlanTitle: string | null
	/** Multiple selected study plans */
	selectedStudyPlans: SelectedStudyPlan[]
	/** IDs of courses the student has already completed */
	completedCourseIdents: string[]
	completed: boolean
}

export interface WizardState {
	currentStep: number
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	/** Multiple selected study plans */
	selectedStudyPlans: SelectedStudyPlan[]
	/** IDs of courses the student has already completed */
	completedCourseIdents: string[]
	completed: boolean
	facultyFacets: FacetItem[]
	yearFacets: FacetItem[]
	levelFacets: FacetItem[]
	studyPlans: StudyPlanWithRelations[]
	levelFilter: string[]
	titleSearch: string
	loading: boolean
	error: string | null
	/** Courses available in selected study plans (for step 4) */
	studyPlanCourses: Course[]
	studyPlanCoursesLoading: boolean
	/** Search filter for completed courses step */
	completedCoursesSearch: string
	/** Category filter for completed courses step */
	completedCoursesCategoryFilter: string[]
}
