import LoggerAPIContext from '@api/Context/LoggerAPIContext'
import TimetableAnalyzeResponse from '@api/Controllers/Kreditozrouti/types/TimetableAnalyzeResponse'
import { ErrorCodeEnum, ErrorTypeEnum } from '@api/Enums/ErrorEnum'
import Exception from '@api/Error/Exception'
import TimetableService from '@api/Services/TimetableService'
import TimetableAnalyzeFilterValidation from '@api/Validations/TimetableAnalyzeFilterValidation'
import { Request, Response } from 'express'

export default async function TimetableAnalyzeController(req: Request, res: Response<TimetableAnalyzeResponse>) {
	LoggerAPIContext.add(res, { body: req.body })

	const result = await TimetableAnalyzeFilterValidation.safeParseAsync(req.body)

	if (!result.success) {
		throw new Exception(400, ErrorTypeEnum.ZOD_VALIDATION, ErrorCodeEnum.VALIDATION, 'Invalid request', { zodIssues: result.error.issues })
	}

	const analysis = TimetableService.analyzeTimetable(result.data.slots)

	LoggerAPIContext.add(res, {
		gaps_count: analysis.gaps.length,
		suggestions_count: analysis.suggestions.length
	})

	return res.status(200).json(analysis)
}
