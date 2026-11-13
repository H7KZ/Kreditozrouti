import type { StudologStatsResponseDTO } from '@kreditozrouti/types'
import { Request, Response } from 'express'
import * as z from 'zod'
import { Errors } from '@api/Errors'
import StudologService from '@api/Services/StudologService'

const CourseIdentSchema = z.string().regex(/^[\w-]{2,16}$/)

export const StudologController = {
	async stats(req: Request, res: Response<StudologStatsResponseDTO>) {
		const result = CourseIdentSchema.safeParse(req.params.ident)
		if (!result.success) throw Errors.validation(result.error.issues)

		res.json({ stats: await StudologService.getStats(result.data.toUpperCase()) })
	}
}
