import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import TimetableGenerateResponse from '@api/Controllers/Kreditozrouti/types/TimetableGenerateResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import TimetableService from '@api/Services/TimetableService'
import TimetableGenerateFilterValidation from '@api/Validations/TimetableGenerateFilterValidation'
import { Request, Response } from 'express'

export default async function TimetableGenerateController(req: Request, res: Response<TimetableGenerateResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await TimetableGenerateFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request', { zodIssues: result.error.issues })
	}

	const timetable = await TimetableService.generateForStudyPlan(result.data.study_plan_id, {
		semester: result.data.semester,
		year: result.data.year,
		preferredDays: result.data.preferred_days,
		preferredTimeFrom: result.data.preferred_time_from,
		preferredTimeTo: result.data.preferred_time_to,
		maxEcts: result.data.max_ects,
		includeElectives: result.data.include_electives
	})

	LoggerAPIContext.add(res, {
		slots_count: timetable.slots.length,
		total_ects: timetable.total_ects,
		conflicts_count: timetable.conflicts.length
	})

	return res.status(200).json({ timetable })
}
