import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import TimetableAlternativesResponse from '@api/Controllers/Kreditozrouti/types/TimetableAlternativesResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import TimetableService from '@api/Services/TimetableService'
import TimetableAlternativesFilterValidation from '@api/Validations/TimetableAlternativesFilterValidation'
import { Request, Response } from 'express'

export default async function TimetableAlternativesController(req: Request, res: Response<TimetableAlternativesResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await TimetableAlternativesFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request', { zodIssues: result.error.issues })
	}

	const alternatives = await TimetableService.suggestAlternatives(result.data.course_id, result.data.current_slots, result.data.limit)

	LoggerAPIContext.add(res, { alternatives_count: alternatives.length })

	return res.status(200).json({
		course_id: result.data.course_id,
		alternatives
	})
}
