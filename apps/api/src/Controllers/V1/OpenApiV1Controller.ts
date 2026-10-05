import { Request, Response } from 'express'
import * as z from 'zod'
import Config from '@api/Config/Config'
import { CoursesQuerySchema, LecturersQuerySchema, PeriodsQuerySchema, StudyPlansQuerySchema, UsageQuerySchema } from './schemas'

type JsonSchema = Record<string, unknown>

/**
 * Query parameters are generated from the same zod schemas the controllers validate with, so the document
 * cannot drift from runtime behaviour. Comma-separated list parameters (`z.preprocess`) have no JSON Schema
 * form, so they are described as string arrays.
 */
function parametersFrom(schema: z.ZodType): JsonSchema[] {
	const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as { properties?: Record<string, JsonSchema>; required?: string[] }

	return Object.entries(json.properties ?? {}).map(([name, raw]) => {
		const isList = Object.keys(raw).length === 0 || raw.type === 'array'
		return {
			name,
			in: 'query',
			required: json.required?.includes(name) ?? false,
			style: isList ? 'form' : undefined,
			explode: isList ? false : undefined,
			schema: isList ? { type: 'array', items: { type: 'string' } } : raw
		}
	})
}

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }

const page = (ref: string) => ({
	type: 'object',
	required: ['data', 'meta'],
	properties: {
		data: { type: 'array', items: { $ref: `#/components/schemas/${ref}` } },
		meta: {
			type: 'object',
			required: ['total', 'limit', 'offset'],
			properties: { total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } }
		}
	}
})

const ok = (schema: JsonSchema) => ({
	description: 'OK',
	headers: {
		'RateLimit-Limit': { schema: { type: 'integer' }, description: 'Requests allowed in the binding window' },
		'RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Requests left in the binding window' },
		'RateLimit-Reset': { schema: { type: 'integer' }, description: 'Seconds until the binding window resets' }
	},
	content: { 'application/json': { schema } }
})

const problemRefs = {
	'401': { $ref: '#/components/responses/Problem' },
	'403': { $ref: '#/components/responses/Problem' },
	'422': { $ref: '#/components/responses/Problem' },
	'429': { $ref: '#/components/responses/RateLimited' }
}

const string = { type: 'string' }
const nullableString = { type: ['string', 'null'] }
const nullableInt = { type: ['integer', 'null'] }

function buildSpec(): JsonSchema {
	return {
		openapi: '3.1.0',
		info: {
			title: 'Kreditozrouti partner API',
			version: '1.0.0',
			description:
				'Read-only course catalogue for approved partners. Authenticate with `Authorization: Bearer kz_live_...`. ' +
				'Keys are server-side secrets and must never be sent from a browser. Errors are RFC 9457 `application/problem+json`. ' +
				'Quota is per consumer: a per-minute burst limit and a daily cap (UTC). Only faculties whose schedule InSIS publishes publicly are served.'
		},
		servers: [{ url: `${Config.uri}/v1` }],
		security: [{ bearerAuth: [] }],
		paths: {
			'/courses': {
				get: {
					summary: 'Search courses',
					description:
						'Needs `catalogue:read`. `lecturer_id` and the `lecturers` fields need `lecturers:read`. `day` with `time_from`/`time_to` matches courses that have a slot overlapping that window.',
					parameters: parametersFrom(CoursesQuerySchema),
					responses: { '200': ok(page('Course')), ...problemRefs }
				}
			},
			'/courses/{id}': {
				get: {
					summary: 'Course detail',
					parameters: [idParam],
					responses: { '200': ok({ $ref: '#/components/schemas/CourseDetail' }), '404': { $ref: '#/components/responses/Problem' }, ...problemRefs }
				}
			},
			'/lecturers': {
				get: {
					summary: 'List lecturers',
					description: 'Needs `lecturers:read`.',
					parameters: parametersFrom(LecturersQuerySchema),
					responses: { '200': ok(page('Lecturer')), ...problemRefs }
				}
			},
			'/lecturers/{id}': {
				get: {
					summary: 'Lecturer detail',
					description: 'Needs `lecturers:read`. `id` is the InSIS person id.',
					parameters: [idParam],
					responses: { '200': ok({ $ref: '#/components/schemas/LecturerDetail' }), '404': { $ref: '#/components/responses/Problem' }, ...problemRefs }
				}
			},
			'/faculties': {
				get: {
					summary: 'List faculties',
					responses: {
						'200': ok({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Faculty' } } } }),
						...problemRefs
					}
				}
			},
			'/periods': {
				get: {
					summary: 'List academic periods',
					parameters: parametersFrom(PeriodsQuerySchema),
					responses: {
						'200': ok({ type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Period' } } } }),
						...problemRefs
					}
				}
			},
			'/study-plans': {
				get: {
					summary: 'List study plans',
					parameters: parametersFrom(StudyPlansQuerySchema),
					responses: { '200': ok(page('StudyPlan')), ...problemRefs }
				}
			},
			'/study-plans/{id}': {
				get: {
					summary: 'Study plan detail',
					parameters: [idParam],
					responses: {
						'200': ok({ $ref: '#/components/schemas/StudyPlanDetail' }),
						'404': { $ref: '#/components/responses/Problem' },
						...problemRefs
					}
				}
			},
			'/usage': {
				get: {
					summary: 'Usage of the calling consumer',
					description:
						'Needs `usage:read`. `today.used` is live; `days` is flushed hourly and lags by up to an hour. Counts against the quota like any other request.',
					parameters: parametersFrom(UsageQuerySchema),
					responses: { '200': ok({ $ref: '#/components/schemas/Usage' }), ...problemRefs }
				}
			}
		},
		components: {
			securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', description: 'API key issued by the Kreditozrouti maintainers' } },
			responses: {
				Problem: {
					description: 'Problem details (RFC 9457)',
					content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } }
				},
				RateLimited: {
					description: 'Quota exhausted',
					headers: { 'Retry-After': { schema: { type: 'integer' }, description: 'Seconds to wait before retrying' } },
					content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } } }
				}
			},
			schemas: {
				Problem: {
					type: 'object',
					required: ['type', 'title', 'status'],
					properties: {
						type: string,
						title: string,
						status: { type: 'integer' },
						detail: string,
						instance: string,
						request_id: string,
						errors: { type: 'array', items: { type: 'object' }, description: 'Validation issues (422)' },
						window: { enum: ['minute', 'day'], description: 'Which window was exhausted (429)' },
						retry_after_seconds: { type: 'integer' }
					}
				},
				LecturerRef: {
					type: 'object',
					required: ['id', 'name', 'role'],
					properties: { id: { type: 'integer', description: 'InSIS person id' }, name: string, role: { enum: ['lecturer', 'guarantor'] } }
				},
				Slot: {
					type: 'object',
					properties: {
						type: { enum: ['lecture', 'exercise', 'seminar', null] },
						frequency: { enum: ['weekly', 'single', null] },
						day: { enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', null] },
						date: nullableString,
						time_from: { ...nullableString, description: 'HH:MM' },
						time_to: { ...nullableString, description: 'HH:MM' },
						location: nullableString
					}
				},
				Unit: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						lecturer: { ...nullableString, description: 'Display name only; needs lecturers:read' },
						capacity: nullableInt,
						note: nullableString,
						slots: { type: 'array', items: { $ref: '#/components/schemas/Slot' } }
					}
				},
				Course: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						ident: string,
						title: nullableString,
						title_cs: nullableString,
						title_en: nullableString,
						ects: { type: ['number', 'null'] },
						faculty_id: nullableString,
						year: nullableInt,
						semester: { enum: ['ZS', 'LS', null] },
						level: nullableString,
						year_of_study: nullableInt,
						languages: { type: 'array', items: string },
						mode_of_delivery: nullableString,
						mode_of_completion: nullableString,
						url: string,
						lecturers: { type: 'array', items: { $ref: '#/components/schemas/LecturerRef' }, description: 'Needs lecturers:read' },
						units: { type: 'array', items: { $ref: '#/components/schemas/Unit' } },
						last_scraped_at: nullableString
					}
				},
				CourseDetail: {
					allOf: [{ $ref: '#/components/schemas/Course' }],
					description: 'Course plus syllabus text, assessments and prerequisite idents (see docs/api/PUBLIC_API.md for the full field list)'
				},
				Lecturer: { type: 'object', required: ['id', 'name'], properties: { id: { type: 'integer', description: 'InSIS person id' }, name: string } },
				LecturerDetail: {
					allOf: [{ $ref: '#/components/schemas/Lecturer' }],
					properties: {
						courses: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									id: { type: 'integer' },
									ident: string,
									title: nullableString,
									year: nullableInt,
									semester: { enum: ['ZS', 'LS', null] },
									role: { enum: ['lecturer', 'guarantor'] }
								}
							}
						}
					}
				},
				Faculty: { type: 'object', properties: { id: string, title: nullableString } },
				Period: {
					type: 'object',
					properties: {
						faculty_id: string,
						year: { type: 'integer' },
						semester: { enum: ['ZS', 'LS', null] },
						level: nullableString,
						starts_at: string,
						ends_at: string
					}
				},
				StudyPlan: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						ident: nullableString,
						title: nullableString,
						faculty_id: nullableString,
						year: nullableInt,
						semester: { enum: ['ZS', 'LS', null] },
						level: nullableString,
						mode_of_study: nullableString,
						study_length: nullableString
					}
				},
				StudyPlanDetail: {
					allOf: [{ $ref: '#/components/schemas/StudyPlan' }],
					properties: { courses: { type: 'array', items: { type: 'object', properties: { ident: string, group: string, category: string } } } }
				},
				Usage: {
					type: 'object',
					properties: {
						consumer: string,
						plan: { type: 'object', properties: { name: string, requests_per_minute: { type: 'integer' }, requests_per_day: { type: 'integer' } } },
						today: { type: 'object', properties: { used: nullableInt, remaining: nullableInt, resets_at: string } },
						days: {
							type: 'array',
							items: { type: 'object', properties: { date: string, requests: { type: 'integer' }, errors: { type: 'integer' } } }
						}
					}
				}
			}
		}
	}
}

let spec: JsonSchema | null = null

export const OpenApiV1Controller = {
	get: (_req: Request, res: Response) => {
		spec ??= buildSpec()
		res.json(spec)
	}
}
