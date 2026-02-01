import { StudyPlanWithRelations } from '@api/Database/types'
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
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanId: number | null
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanIdent: string | null
	/** @deprecated Use selectedStudyPlans instead */
	studyPlanTitle: string | null
	/** Multiple selected study plans */
	selectedStudyPlans: SelectedStudyPlan[]
	completed: boolean
}

export interface WizardState {
	currentStep: number
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	/** Multiple selected study plans */
	selectedStudyPlans: SelectedStudyPlan[]
	completed: boolean
	facultyFacets: FacetItem[]
	yearFacets: FacetItem[]
	levelFacets: FacetItem[]
	studyPlans: StudyPlanWithRelations[]
	levelFilter: string[]
	titleSearch: string
	loading: boolean
	error: string | null
}
