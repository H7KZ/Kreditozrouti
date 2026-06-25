import { randomBytes } from 'crypto'
import type { ICalCreateResponse } from '@shared/http/ical'
import { Request, Response } from 'express'
import * as z from 'zod'
import { CourseUnitTypeValues } from '@shared/domain/insis'
import { DayValues } from '@shared/domain/constants'
import { redis } from '@api/clients'
import { Errors } from '@api/Errors'

const ICAL_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days

const ICalUnitSchema = z.object({
	courseId: z.number(),
	courseIdent: z.string(),
	courseTitle: z.string(),
	courseTitleCs: z.string(),
	courseTitleEn: z.string(),
	unitId: z.number(),
	unitType: z.enum(CourseUnitTypeValues),
	slotId: z.number(),
	day: z.enum(DayValues).optional(),
	date: z.string().optional(),
	timeFrom: z.number().int().min(0).max(1439),
	timeTo: z.number().int().min(0).max(1439),
	location: z.string().optional(),
	lecturer: z.string().optional()
})

const ICalConfigSchema = z.object({
	slotId: z.number(),
	title: z.string(),
	location: z.string(),
	description: z.string()
})

const ICalCreateSchema = z.object({
	units: z.array(ICalUnitSchema).min(1).max(50),
	configs: z.array(ICalConfigSchema).min(1).max(50),
	semesterStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	semesterEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

export default async function ICalCreateController(req: Request, res: Response<ICalCreateResponse>) {
	const result = await ICalCreateSchema.safeParseAsync(req.body)
	if (!result.success) throw Errors.validation(result.error.issues)

	const id = randomBytes(6).toString('base64url')
	await redis.set(`ical:${id}`, JSON.stringify(result.data), 'EX', ICAL_TTL_SECONDS)

	return res.status(201).json({ id })
}
