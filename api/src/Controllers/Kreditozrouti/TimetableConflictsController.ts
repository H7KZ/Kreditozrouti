import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import TimetableConflictsResponse from '@api/Controllers/Kreditozrouti/types/TimetableConflictsResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import TimetableService from '@api/Services/TimetableService'
import TimetableConflictsFilterValidation from '@api/Validations/TimetableConflictsFilterValidation'
import { Request, Response } from 'express'

export default async function TimetableConflictsController(req: Request, res: Response<TimetableConflictsResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await TimetableConflictsFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request', { zodIssues: result.error.issues })
	}

	const conflicts = await TimetableService.checkConflicts(result.data.selections)

	LoggerAPIContext.add(res, { conflicts_count: conflicts.length })

	return res.status(200).json({
		has_conflicts: conflicts.length > 0,
		conflicts
	})
}
