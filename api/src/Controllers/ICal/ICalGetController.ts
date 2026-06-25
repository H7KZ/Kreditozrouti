import type { ICalConfig, ICalCreateRequest, ICalUnit } from '@shared/http/ical'
import { Request, Response } from 'express'
import { redis } from '@api/clients'
import { Errors } from '@api/Errors'
import { generateIcal } from '@api/utils/ical'

const ICAL_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days

export default async function ICalGetController(req: Request, res: Response) {
	const { id } = req.params
	const raw = await redis.get(`ical:${id}`)

	if (!raw) throw Errors.notFound('iCal link not found or expired')

	await redis.expire(`ical:${id}`, ICAL_TTL_SECONDS)

	const { units, configs, semesterStart, semesterEnd } = JSON.parse(raw) as ICalCreateRequest

	const ics = generateIcal(units as ICalUnit[], configs as ICalConfig[], new Date(semesterStart), new Date(semesterEnd))

	res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
	res.setHeader('Content-Disposition', 'attachment; filename="rozvrh-kreditozrouti.ics"')
	return res.status(200).send(ics)
}
