import type { ScoreBreakdown, SolverAssignment, SolverSlotCandidate, SolverVariable } from '@shared/domain/optimizer'
import type {
	OptimizerCandidateDTO,
	OptimizeRequest,
	OptimizeResponseDTO,
	RemovalCandidateDTO,
	ScoreBreakdownDTO,
	SelectedCourseUnitDTO,
	SolverConstraints
} from '@shared/http/optimize'
import type { CourseUnitDTO, CourseWithRelationsDTO } from '@shared/http/responses'
import { getSlotType } from '@shared/domain/insis'
import { DEFAULT_WEIGHTS, diversityFilter, scoreCandidate, solveWithDeadline } from '@shared/domain/optimizer'
import { MAX_POOL_SIZE } from '@shared/http/optimize'
import { Errors } from '@api/Errors'
import CourseService from '@api/Services/CourseService'

/**
 * Upper bound (in ms) on how long solveWithDeadline is allowed to search before
 * returning best-so-far partial results. The deadline is polled INSIDE the
 * solver's recursion — this is only the budget handed to that recursion.
 */
const SOLVER_BUDGET_MS = 4500

/** Number of diverse candidates returned to the client per section. */
const MAX_CANDIDATES = 5

export default class OptimizeService {
	static async optimize(request: OptimizeRequest): Promise<OptimizeResponseDTO> {
		const courseIds = request.course_ids.slice(0, MAX_POOL_SIZE)
		const poolTruncated = request.course_ids.length > MAX_POOL_SIZE
		const { courses } = await CourseService.getCoursesWithRelations({ ids: courseIds }, courseIds.length, 0)
		return OptimizeService.optimizeBuild(courses as unknown as CourseWithRelationsDTO[], request, poolTruncated)
	}

	/**
	 * Maps DB courses/units/slots into SolverVariable[]. One variable per
	 * (courseId, unitType), with a domain of every concrete slot of that type.
	 * Slots with null time_from/time_to are skipped (cannot be scheduled).
	 */
	private static buildVariables(courses: CourseWithRelationsDTO[]): SolverVariable[] {
		const domainsByKey = new Map<string, SolverSlotCandidate[]>()

		for (const course of courses) {
			for (const unit of course.units ?? []) {
				for (const slot of unit.slots ?? []) {
					if (slot.time_from == null || slot.time_to == null) continue

					const unitType = getSlotType(slot)
					const key = `${course.id}:${unitType}`
					const candidate: SolverSlotCandidate = {
						unitId: unit.id,
						slotId: slot.id,
						courseId: course.id,
						unitType,
						day: slot.day ?? undefined,
						date: slot.date ?? undefined,
						timeFrom: slot.time_from,
						timeTo: slot.time_to,
						location: slot.location ?? undefined
					}

					const existing = domainsByKey.get(key)
					if (existing) existing.push(candidate)
					else domainsByKey.set(key, [candidate])
				}
			}
		}

		const variables: SolverVariable[] = []
		for (const [key, domain] of domainsByKey) {
			const [courseIdStr, unitType] = key.split(':') as [string, SolverSlotCandidate['unitType']]
			variables.push({ courseId: Number(courseIdStr), unitType, domain })
		}
		return variables
	}

	/**
	 * Pre-filters solver variables by removing any domain slot that overlaps a blackout window.
	 * Called before solveWithDeadline so the constraint is enforced without threading it into
	 * the recursive solver.
	 */
	private static filterCandidatesByBlackout(variables: SolverVariable[], blackoutWindows: SolverConstraints['blackout_windows']): SolverVariable[] {
		if (!blackoutWindows?.length) return variables
		return variables.map(v => ({
			...v,
			domain: v.domain.filter(c => !blackoutWindows.some(w => w.day && c.day === w.day && c.timeFrom < w.time_to && c.timeTo > w.time_from))
		}))
	}

	/**
	 * Drops solver assignments whose total ECTS falls outside [credit_min, credit_max].
	 * Applied after solving, before ranking/mapping.
	 */
	private static filterByCredit(
		assignments: SolverAssignment[],
		constraints: SolverConstraints,
		courseById: Map<number, CourseWithRelationsDTO>
	): SolverAssignment[] {
		const { credit_min, credit_max } = constraints
		if (credit_min == null && credit_max == null) return assignments
		return assignments.filter(assignment => {
			const totalEcts = [...Object.keys(assignment)].reduce((sum, id) => {
				return sum + (courseById.get(Number(id))?.ects ?? 0)
			}, 0)
			if (credit_min != null && totalEcts < credit_min) return false
			if (credit_max != null && totalEcts > credit_max) return false
			return true
		})
	}

	/** Derives the snapshot of unit types available for a course, mirroring timetable.store's addUnit. */
	private static snapshotAvailableTypes(course: CourseWithRelationsDTO): SelectedCourseUnitDTO['snapshotAvailableTypes'] {
		const types: CourseUnitDTO['slots'][number]['type'][] = []
		const seen = new Set<string>()
		for (const unit of course.units ?? []) {
			for (const slot of unit.slots ?? []) {
				const type = getSlotType(slot)
				if (!seen.has(type)) {
					seen.add(type)
					types.push(type)
				}
			}
		}
		return types as SelectedCourseUnitDTO['snapshotAvailableTypes']
	}

	/**
	 * Rebuilds a SolverSlotCandidate into the wire-format SelectedCourseUnitDTO,
	 * using the SAME field mapping as timetable.store's addUnit.
	 */
	private static toSelectedCourseUnitDTO(candidate: SolverSlotCandidate, courseById: Map<number, CourseWithRelationsDTO>): SelectedCourseUnitDTO {
		const course = courseById.get(candidate.courseId)
		const unit = course?.units.find(u => u.id === candidate.unitId)

		return {
			courseId: candidate.courseId,
			courseIdent: course?.ident ?? '',
			courseTitle: course?.title ?? course?.title_en ?? course?.title_cs ?? '',
			courseTitleCs: course?.title_cs ?? course?.title ?? '',
			courseTitleEn: course?.title_en ?? course?.title ?? '',
			unitId: candidate.unitId,
			unitType: candidate.unitType,
			slotId: candidate.slotId,
			day: candidate.day,
			date: candidate.date,
			timeFrom: candidate.timeFrom,
			timeTo: candidate.timeTo,
			location: candidate.location,
			lecturer: unit?.lecturer ?? undefined,
			ects: course?.ects ?? undefined,
			snapshotAvailableTypes: course ? OptimizeService.snapshotAvailableTypes(course) : undefined
		}
	}

	private static toScoreBreakdownDTO(score: ScoreBreakdown): ScoreBreakdownDTO {
		return {
			campus_conflicts: score.campusConflicts,
			gap_minutes: score.gapMinutes,
			off_preferred_days: score.offPreferredDays,
			long_study_blocks: score.longStudyBlocks,
			total: score.total
		}
	}

	/**
	 * Scores every assignment, sorts ascending by score.total, diversity-filters
	 * to MAX_CANDIDATES, then maps each kept assignment to an OptimizerCandidateDTO.
	 */
	private static rankAndMapCandidates(
		assignments: SolverAssignment[],
		constraints: SolverConstraints,
		courseById: Map<number, CourseWithRelationsDTO>
	): OptimizerCandidateDTO[] {
		if (assignments.length === 0) return []
		const scored = assignments.map(assignment => ({ assignment, score: scoreCandidate(assignment, constraints, DEFAULT_WEIGHTS) }))
		scored.sort((a, b) => a.score.total - b.score.total)
		const kept = diversityFilter(
			scored.map(s => s.assignment),
			MAX_CANDIDATES
		)
		return kept.map(assignment => ({
			units: Object.values(assignment).map(c => OptimizeService.toSelectedCourseUnitDTO(c, courseById)),
			score: OptimizeService.toScoreBreakdownDTO(scoreCandidate(assignment, constraints, DEFAULT_WEIGHTS)),
			changed_unit_ids: [] as number[]
		}))
	}

	private static optimizeBuild(courses: CourseWithRelationsDTO[], request: OptimizeRequest, poolTruncated: boolean): OptimizeResponseDTO {
		try {
			const courseById = new Map(courses.map(c => [c.id, c]))
			const allVariables = OptimizeService.buildVariables(courses)
			const effectiveVariables = OptimizeService.filterCandidatesByBlackout(allVariables, request.constraints.blackout_windows)

			// Pass 1: solve with all basket courses free
			const { candidates: raw1, partial: partial1 } = solveWithDeadline(effectiveVariables, [], SOLVER_BUDGET_MS)
			const fullCandidates = OptimizeService.rankAndMapCandidates(
				OptimizeService.filterByCredit(raw1, request.constraints, courseById),
				request.constraints,
				courseById
			)

			// Pass 2: drop one course at a time, keep best per dropped course
			const removalResults: { course: CourseWithRelationsDTO; candidate: OptimizerCandidateDTO }[] = []
			const pass2Deadline = Date.now() + SOLVER_BUDGET_MS
			let anyPartial2 = false

			for (const course of courses) {
				const remaining = pass2Deadline - Date.now()
				if (remaining <= 0) break
				const varsWithout = effectiveVariables.filter(v => v.courseId !== course.id)
				const { candidates: raw2, partial: p2 } = solveWithDeadline(varsWithout, [], Math.min(remaining, SOLVER_BUDGET_MS))
				if (p2) anyPartial2 = true
				const ranked2 = OptimizeService.rankAndMapCandidates(
					OptimizeService.filterByCredit(raw2, request.constraints, courseById),
					request.constraints,
					courseById
				)
				if (ranked2[0]) removalResults.push({ course, candidate: ranked2[0] })
			}

			// Sort ascending by score.total, keep top MAX_CANDIDATES
			removalResults.sort((a, b) => a.candidate.score.total - b.candidate.score.total)
			const removalCandidates: RemovalCandidateDTO[] = removalResults.slice(0, MAX_CANDIDATES).map(r => ({
				...r.candidate,
				dropped_course_id: r.course.id,
				dropped_course_title: r.course.title ?? r.course.title_en ?? r.course.title_cs ?? r.course.ident
			}))

			return {
				full_candidates: fullCandidates,
				removal_candidates: removalCandidates,
				partial: partial1 || anyPartial2,
				pool_truncated: poolTruncated
			}
		} catch (error) {
			throw Errors.internal(error instanceof Error ? error.message : 'Failed to optimize timetable')
		}
	}
}
