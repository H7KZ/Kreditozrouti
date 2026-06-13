import type { InSISSemester } from '@shared/domain/insis'

export interface SelectedStudyPlan {
	id: number
	ident: string | null
	title: string | null
	year: number | null
	semester: InSISSemester | null
}

export interface PersistedWizardState {
	facultyId: string | null
	year: number | null
	semester: InSISSemester
	studyPlanId: number | null
	studyPlanIdent: string | null
	studyPlanTitle: string | null
	selectedStudyPlans: SelectedStudyPlan[]
	completedCourseIdents: string[]
	completed: boolean
}
