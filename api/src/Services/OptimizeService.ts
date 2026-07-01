import type { OptimizeRequest, OptimizeResponseDTO, OptimizerCandidateDTO, ScoreBreakdownDTO, SelectedCourseUnitDTO } from '@shared/http/optimize'
import { MAX_POOL_SIZE } from '@shared/http/optimize'
import { getSlotType } from '@shared/domain/insis'
import { diversityFilter, DEFAULT_WEIGHTS, scoreCandidate, solveWithDeadline } from '@shared/domain/optimizer'
import type { ScoreBreakdown, SolverAssignment, SolverSlotCandidate, SolverVariable } from '@shared/domain/optimizer'
import type { CourseUnitDTO, CourseUnitSlotDTO, CourseWithRelationsDTO } from '@shared/http/responses'
import { Errors } from '@api/Errors'
import CourseService from '@api/Services/CourseService'

/**
 * Upper bound (in ms) on how long solveWithDeadline is allowed to search before
 * returning best-so-far partial results. The deadline is polled INSIDE the
 * solver's recursion (shared/domain/optimizer.ts) — this constant is only the
 * budget handed to that recursion, never a setTimeout/Promise.race wrapper.
 */
const SOLVER_BUDGET_MS = 4500

/** Number of diverse candidates returned to the client per request. */
const MAX_CANDIDATES = 5

export default class OptimizeService {
	static async optimize(request: OptimizeRequest): Promise<OptimizeResponseDTO> {
		const { cappedCourseIds, poolTruncated } = OptimizeService.capPool(request)

		const { courses } = await CourseService.getCoursesWithRelations({ ids: cappedCourseIds }, cappedCourseIds.length, 0)

		const filteredCourses = OptimizeService.filterExcluded(courses as unknown as CourseWithRelationsDTO[], request)

		if (request.mode === 'add') {
			return OptimizeService.optimizeAddMode(filteredCourses, request, poolTruncated)
		}

		return OptimizeService.optimizeBuildMode(filteredCourses, request, poolTruncated)
	}

	/**
	 * Caps course_ids to MAX_POOL_SIZE before fetching, always keeping
	 * required_course_ids (hard constraint — never dropped by the cap).
	 */
	private static capPool(request: OptimizeRequest): { cappedCourseIds: number[]; poolTruncated: boolean } {
		if (request.course_ids.length <= MAX_POOL_SIZE) {
			return { cappedCourseIds: request.course_ids, poolTruncated: false }
		}

		const mustKeep = new Set(request.constraints.required_course_ids ?? [])
		const kept: number[] = []
		const keptSet = new Set<number>()

		for (const id of request.course_ids) {
			if (mustKeep.has(id)) {
				kept.push(id)
				keptSet.add(id)
			}
		}

		for (const id of request.course_ids) {
			if (kept.length >= MAX_POOL_SIZE) break
			if (keptSet.has(id)) continue
			kept.push(id)
			keptSet.add(id)
		}

		return { cappedCourseIds: kept.slice(0, MAX_POOL_SIZE), poolTruncated: true }
	}

	/** Drops excluded_course_ids from the fetched pool; required_course_ids are never dropped. */
	private static filterExcluded(courses: CourseWithRelationsDTO[], request: OptimizeRequest): CourseWithRelationsDTO[] {
		const excluded = new Set(request.constraints.excluded_course_ids ?? [])
		if (excluded.size === 0) return courses
		return courses.filter(course => !excluded.has(course.id))
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

	/** Derives the snapshot of unit types available for a course, mirroring client/src/stores/timetable.store.ts's addUnit. */
	private static snapshotAvailableTypes(course: CourseWithRelationsDTO): SelectedCourseUnitDTO['snapshotAvailableTypes'] {
		const types: CourseUnitDTO['slots'][number]['type'][] = []
		const seen = new Set<string>()
		for (const unit of course.units ?? []) {
			for (const slot of unit.slots ?? []) {
				const type = getSlotType(slot as CourseUnitSlotDTO)
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
	 * using the SAME field mapping as client/src/stores/timetable.store.ts's addUnit.
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
		request: OptimizeRequest,
		courseById: Map<number, CourseWithRelationsDTO>,
		lockedUnitIds: Set<number>
	): OptimizerCandidateDTO[] {
		const scored = assignments.map(assignment => ({ assignment, score: scoreCandidate(assignment, request.constraints, DEFAULT_WEIGHTS) }))
		scored.sort((a, b) => a.score.total - b.score.total)

		const sortedAssignments = scored.map(s => s.assignment)
		const kept = diversityFilter(sortedAssignments, MAX_CANDIDATES)

		return kept.map(assignment => {
			const score = scoreCandidate(assignment, request.constraints, DEFAULT_WEIGHTS)
			const units = Object.values(assignment).map(candidate => OptimizeService.toSelectedCourseUnitDTO(candidate, courseById))
			const changedUnitIds = units.filter(u => !lockedUnitIds.has(u.unitId)).map(u => u.unitId)

			return {
				units,
				score: OptimizeService.toScoreBreakdownDTO(score),
				changed_unit_ids: changedUnitIds
			}
		})
	}

	private static optimizeBuildMode(courses: CourseWithRelationsDTO[], request: OptimizeRequest, poolTruncated: boolean): OptimizeResponseDTO {
		try {
			const courseById = new Map(courses.map(c => [c.id, c]))
			const variables = OptimizeService.buildVariables(courses)

			const { candidates: assignments, partial } = solveWithDeadline(variables, [], SOLVER_BUDGET_MS)
			const candidates = OptimizeService.rankAndMapCandidates(assignments, request, courseById, new Set())

			return { candidates, partial, unlocked_course_id: undefined, pool_truncated: poolTruncated }
		} catch (error) {
			throw Errors.internal(error instanceof Error ? error.message : 'Failed to optimize timetable')
		}
	}

	/**
	 * Add-course mode: locked_unit_ids pins the student's existing selections as
	 * fixed SolverSlotCandidates, leaving only the new course's variables free.
	 * If the first attempt yields zero candidates, unlocks exactly ONE locked
	 * course at a time (never pairs — RESEARCH Pitfall 5 / CONTEXT.md bound),
	 * re-solving with that course's units moved back into the free variable set.
	 * Uses the first success, or — if multiple single-unlock solves succeed —
	 * the one whose best candidate has the lowest score.total.
	 */
	private static optimizeAddMode(courses: CourseWithRelationsDTO[], request: OptimizeRequest, poolTruncated: boolean): OptimizeResponseDTO {
		try {
			const courseById = new Map(courses.map(c => [c.id, c]))
			const lockedUnitIds = new Set(request.locked_unit_ids ?? [])

			const allVariables = OptimizeService.buildVariables(courses)

			// Locked candidates: the concrete slot in each variable's domain matching a locked unit ID.
			const locked: SolverSlotCandidate[] = []
			const lockedCourseIds = new Set<number>()
			const freeVariables: SolverVariable[] = []

			for (const variable of allVariables) {
				const lockedCandidate = variable.domain.find(c => lockedUnitIds.has(c.unitId))
				if (lockedCandidate) {
					locked.push(lockedCandidate)
					lockedCourseIds.add(variable.courseId)
				} else {
					freeVariables.push(variable)
				}
			}

			// First attempt: solve with all existing locked, only the new course's variables free.
			let { candidates: assignments, partial } = solveWithDeadline(freeVariables, locked, SOLVER_BUDGET_MS)

			if (assignments.length > 0) {
				const candidates = OptimizeService.rankAndMapCandidates(assignments, request, courseById, lockedUnitIds)
				return { candidates, partial, unlocked_course_id: undefined, pool_truncated: poolTruncated }
			}

			// No clean slot with everything locked — unlock exactly one locked course at a time.
			let bestUnlockedCourseId: number | undefined
			let bestAssignments: SolverAssignment[] = []
			let bestPartial = partial
			let bestScoreTotal = Number.POSITIVE_INFINITY

			for (const courseIdToUnlock of lockedCourseIds) {
				const stillLocked = locked.filter(c => c.courseId !== courseIdToUnlock)
				const unlockedVariables = allVariables.filter(v => v.courseId === courseIdToUnlock || !lockedCourseIds.has(v.courseId))

				const result = solveWithDeadline(unlockedVariables, stillLocked, SOLVER_BUDGET_MS)
				if (result.candidates.length === 0) continue

				const bestOfThisAttempt = result.candidates.reduce((best, candidate) => {
					const total = scoreCandidate(candidate, request.constraints, DEFAULT_WEIGHTS).total
					return total < best.total ? { assignment: candidate, total } : best
				}, { assignment: result.candidates[0]!, total: scoreCandidate(result.candidates[0]!, request.constraints, DEFAULT_WEIGHTS).total })

				if (bestOfThisAttempt.total < bestScoreTotal) {
					bestScoreTotal = bestOfThisAttempt.total
					bestUnlockedCourseId = courseIdToUnlock
					bestAssignments = result.candidates
					bestPartial = result.partial
				}
			}

			if (bestUnlockedCourseId === undefined) {
				return { candidates: [], partial, unlocked_course_id: undefined, pool_truncated: poolTruncated }
			}

			const unlockedLockedUnitIds = new Set(lockedUnitIds)
			for (const c of locked) {
				if (c.courseId === bestUnlockedCourseId) unlockedLockedUnitIds.delete(c.unitId)
			}

			const candidates = OptimizeService.rankAndMapCandidates(bestAssignments, request, courseById, unlockedLockedUnitIds)
			return { candidates, partial: bestPartial, unlocked_course_id: bestUnlockedCourseId, pool_truncated: poolTruncated }
		} catch (error) {
			throw Errors.internal(error instanceof Error ? error.message : 'Failed to optimize timetable')
		}
	}
}
