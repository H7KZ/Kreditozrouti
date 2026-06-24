import { randomBytes } from 'crypto'
import type { ShareCreateResponse } from '@shared/http/share'
import { Request, Response } from 'express'
import * as z from 'zod'
import { CourseUnitTypeValues, InSISDayValues } from '@shared/domain/insis'
import { redis } from '@api/clients'
import { Errors } from '@api/Errors'

const SHARE_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days

const ShareableUnitSchema = z.object({
	courseId: z.number(),
	courseIdent: z.string(),
	courseTitle: z.string(),
	courseTitleCs: z.string(),
	courseTitleEn: z.string(),
	unitId: z.number(),
	unitType: z.enum(CourseUnitTypeValues),
	slotId: z.number(),
	day: z.enum(InSISDayValues).optional(),
	date: z.string().optional(),
	timeFrom: z.number().int().min(0).max(1439),
	timeTo: z.number().int().min(0).max(1439),
	location: z.string().optional(),
	lecturer: z.string().optional(),
	ects: z.number().optional(),
	snapshotAvailableTypes: z.array(z.enum(CourseUnitTypeValues)).optional()
})

const ShareCreateSchema = z.object({
	units: z.array(ShareableUnitSchema).min(1).max(50)
})

export default async function ShareCreateController(req: Request, res: Response<ShareCreateResponse>) {
	const result = await ShareCreateSchema.safeParseAsync(req.body)
	if (!result.success) throw Errors.validation(result.error.issues)

	const id = randomBytes(6).toString('base64url') // ~8 URL-safe chars, 48 bits entropy
	await redis.set(`share:${id}`, JSON.stringify(result.data.units), 'EX', SHARE_TTL_SECONDS)

	return res.status(201).json({ id })
}
