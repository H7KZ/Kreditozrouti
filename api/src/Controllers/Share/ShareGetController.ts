import { Request, Response } from 'express'
import type { ShareableUnit, ShareGetResponse } from '@shared/http/share'
import { redis } from '@api/clients'
import { Errors } from '@api/Errors'

const SHARE_TTL_SECONDS = 180 * 24 * 60 * 60 // 180 days

export default async function ShareGetController(req: Request, res: Response<ShareGetResponse>) {
	const { id } = req.params
	const raw = await redis.get(`share:${id}`)

	if (!raw) throw Errors.notFound('Share link not found or expired')

	// Rolling TTL: reset expiry on each visit
	await redis.expire(`share:${id}`, SHARE_TTL_SECONDS)

	const units = JSON.parse(raw) as ShareableUnit[]
	return res.status(200).json({ units })
}
