/**
 * Operator CLI for partner API consumers and keys (ADR 0004, 0005). Run on the server, never exposed over HTTP.
 *
 *   production:  docker compose exec api node dist/apps/api/src/Scripts/partnerKeys.js <command> ...
 *   development: pnpm --filter @kreditozrouti/api partner-keys <command> ...
 *
 * Commands:
 *   create-consumer <slug> <name> [--plan partner] [--email a@b.cz]
 *   create-key <consumer-slug> [--label text] [--scopes catalogue:read,lecturers:read,usage:read] [--expires-days N]
 *                              [--origins https://app.example.cz,https://www.example.cz]
 *   list
 *   set-origins <prefix> <origin[,origin...]|none>
 *   revoke <prefix>
 *   disable-consumer <slug>
 *   enable-consumer <slug>
 *   set-plan <slug> <plan>
 *   create-plan <name> <requests-per-minute> <requests-per-day>
 *
 * A new key is printed once and cannot be recovered. Revocation, plan and origin changes reach every replica within 15 seconds.
 *
 * Origins make a key usable from a browser on exactly those sites (exact origins, no wildcards; http only for localhost).
 * Without origins a key is server-to-server only and a browser request with it is refused. Such a key is public by
 * nature, so give browser keys only the scopes the frontend needs.
 */
import { parseArgs } from 'node:util'
import type { ApiScope } from '@kreditozrouti/types'
import { generateApiKey, parseOrigin } from '@kreditozrouti/core/partner-api'
import { ApiScopeValues } from '@kreditozrouti/types'
import { mysql } from '@api/clients/mysql'
import { ApiConsumerTable, ApiKeyTable, ApiPlanTable } from '@api/Database/types'

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

function fail(message: string): never {
	console.error(`error: ${message}`)
	process.exit(1)
}

async function planByName(name: string) {
	const plan = await mysql.selectFrom(ApiPlanTable._table).selectAll().where('name', '=', name).executeTakeFirst()
	return plan ?? fail(`unknown plan "${name}" (create it with create-plan)`)
}

async function consumerBySlug(slug: string) {
	const consumer = await mysql.selectFrom(ApiConsumerTable._table).selectAll().where('slug', '=', slug).executeTakeFirst()
	return consumer ?? fail(`unknown consumer "${slug}"`)
}

function parseScopes(raw: string | undefined): ApiScope[] {
	const scopes = (raw ? raw.split(',').map(s => s.trim()) : [...ApiScopeValues]).filter(Boolean)
	const unknown = scopes.filter(s => !(ApiScopeValues as readonly string[]).includes(s))
	if (unknown.length) fail(`unknown scope(s): ${unknown.join(', ')} (valid: ${ApiScopeValues.join(', ')})`)
	return scopes as ApiScope[]
}

/** Parses a comma-separated origin list. "none" (or an empty value) means no origins, i.e. server-to-server only. */
function parseOrigins(raw: string | undefined): string[] {
	if (!raw || raw.trim().toLowerCase() === 'none') return []

	const origins = raw.split(',').map(value => {
		const origin = parseOrigin(value)
		return origin ?? fail(`invalid origin "${value.trim()}": use scheme://host[:port] with no path or wildcard (https, or http for localhost)`)
	})
	return [...new Set(origins)]
}

async function main(): Promise<void> {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: {
			plan: { type: 'string' },
			email: { type: 'string' },
			label: { type: 'string' },
			scopes: { type: 'string' },
			'expires-days': { type: 'string' },
			origins: { type: 'string' }
		}
	})

	const [command, ...args] = positionals

	switch (command) {
		case 'create-consumer': {
			const [slug, name] = args
			if (!slug || !name) fail('usage: create-consumer <slug> <name> [--plan partner] [--email a@b.cz]')
			if (!/^[a-z0-9-]{2,64}$/.test(slug)) fail('slug must be 2-64 characters of a-z, 0-9 and -')

			const plan = await planByName(values.plan ?? 'partner')
			await mysql
				.insertInto(ApiConsumerTable._table)
				.values({ slug, name, plan_id: plan.id, contact_email: values.email ?? null })
				.execute()
			console.log(`created consumer "${slug}" on plan "${plan.name}"`)
			break
		}

		case 'create-key': {
			const [slug] = args
			if (!slug) fail('usage: create-key <consumer-slug> [--label text] [--scopes a,b] [--expires-days N] [--origins a,b]')

			const consumer = await consumerBySlug(slug)
			const scopes = parseScopes(values.scopes)
			const origins = parseOrigins(values.origins)
			const expiresDays = values['expires-days'] ? Number(values['expires-days']) : null
			if (expiresDays !== null && (!Number.isInteger(expiresDays) || expiresDays < 1)) fail('--expires-days must be a positive integer')
			const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 86_400_000).toISOString().slice(0, 19).replace('T', ' ') : null

			// The lookup prefix is unique; on the (astronomically unlikely) collision, draw a new key.
			for (let attempt = 0; attempt < 5; attempt++) {
				const generated = generateApiKey()
				try {
					await mysql
						.insertInto(ApiKeyTable._table)
						.values({
							consumer_id: consumer.id,
							prefix: generated.prefix,
							key_hash: generated.hash,
							label: values.label ?? null,
							scopes: JSON.stringify(scopes),
							allowed_origins: origins.length ? JSON.stringify(origins) : null,
							expires_at: expiresAt
						})
						.execute()

					console.log(
						`created key ${generated.prefix} for "${slug}" with scopes ${scopes.join(', ')}${expiresAt ? `, expires ${expiresAt} UTC` : ''}${origins.length ? `, browser origins ${origins.join(', ')}` : ', server-to-server only'}`
					)
					console.log('')
					console.log(generated.key)
					console.log('')
					console.log('Copy it now: it is shown once and only its hash is stored.')
					return
				} catch (error) {
					if (!(error instanceof Error) || !/duplicate/i.test(error.message)) throw error
				}
			}
			fail('could not generate a unique key prefix')
			break
		}

		case 'list': {
			const rows = await mysql
				.selectFrom(`${ApiConsumerTable._table} as c`)
				.innerJoin(`${ApiPlanTable._table} as p`, 'p.id', 'c.plan_id')
				.leftJoin(`${ApiKeyTable._table} as k`, 'k.consumer_id', 'c.id')
				.select([
					'c.slug',
					'c.disabled_at',
					'p.name as plan',
					'p.requests_per_minute as rpm',
					'p.requests_per_day as rpd',
					'k.prefix',
					'k.label',
					'k.scopes',
					'k.allowed_origins',
					'k.last_used_at',
					'k.expires_at',
					'k.revoked_at'
				])
				.orderBy('c.slug')
				.orderBy('k.id')
				.execute()

			for (const row of rows) {
				const state = row.disabled_at ? 'DISABLED' : 'active'
				const key = row.prefix
					? `${row.prefix} [${(row.scopes ?? []).join(',')}] ${row.revoked_at ? 'REVOKED' : 'ok'} ${row.allowed_origins?.length ? `origins=${row.allowed_origins.join(',')}` : 'server-only'} last_used=${row.last_used_at?.toISOString() ?? 'never'}${row.label ? ` (${row.label})` : ''}`
					: '(no keys)'
				console.log(`${row.slug} ${state} plan=${row.plan} ${row.rpm}/min ${row.rpd}/day  ${key}`)
			}
			if (rows.length === 0) console.log('no consumers')
			break
		}

		case 'set-origins': {
			const [prefix, rawOrigins] = args
			if (!prefix || rawOrigins === undefined) fail('usage: set-origins <prefix> <origin[,origin...]|none>')

			const origins = parseOrigins(rawOrigins)
			const result = await mysql
				.updateTable(ApiKeyTable._table)
				.set({ allowed_origins: origins.length ? JSON.stringify(origins) : null })
				.where('prefix', '=', prefix)
				.where('revoked_at', 'is', null)
				.executeTakeFirst()
			if (Number(result.numUpdatedRows) === 0) fail(`no active key with prefix "${prefix}"`)
			console.log(
				origins.length
					? `key ${prefix} may now be used from ${origins.join(', ')} (takes effect within 15 seconds)`
					: `key ${prefix} is now server-to-server only`
			)
			break
		}

		case 'revoke': {
			const [prefix] = args
			if (!prefix) fail('usage: revoke <prefix>')

			const result = await mysql
				.updateTable(ApiKeyTable._table)
				.set({ revoked_at: now() })
				.where('prefix', '=', prefix)
				.where('revoked_at', 'is', null)
				.executeTakeFirst()
			if (Number(result.numUpdatedRows) === 0) fail(`no active key with prefix "${prefix}"`)
			console.log(`revoked ${prefix}`)
			break
		}

		case 'disable-consumer':
		case 'enable-consumer': {
			const [slug] = args
			if (!slug) fail(`usage: ${command} <slug>`)

			const consumer = await consumerBySlug(slug)
			await mysql
				.updateTable(ApiConsumerTable._table)
				.set({ disabled_at: command === 'disable-consumer' ? now() : null })
				.where('id', '=', consumer.id)
				.execute()
			console.log(`${command === 'disable-consumer' ? 'disabled' : 'enabled'} consumer "${slug}"`)
			break
		}

		case 'set-plan': {
			const [slug, planName] = args
			if (!slug || !planName) fail('usage: set-plan <slug> <plan>')

			const [consumer, plan] = await Promise.all([consumerBySlug(slug), planByName(planName)])
			await mysql.updateTable(ApiConsumerTable._table).set({ plan_id: plan.id }).where('id', '=', consumer.id).execute()
			console.log(`consumer "${slug}" is now on plan "${plan.name}" (takes effect within 15 seconds)`)
			break
		}

		case 'create-plan': {
			const [name, rpm, rpd] = args
			const perMinute = Number(rpm)
			const perDay = Number(rpd)
			if (!name || !Number.isInteger(perMinute) || !Number.isInteger(perDay) || perMinute < 1 || perDay < 1)
				fail('usage: create-plan <name> <requests-per-minute> <requests-per-day>')

			await mysql.insertInto(ApiPlanTable._table).values({ name, requests_per_minute: perMinute, requests_per_day: perDay }).execute()
			console.log(`created plan "${name}" ${perMinute}/min ${perDay}/day`)
			break
		}

		default:
			fail('unknown command. See the header of apps/api/src/Scripts/partnerKeys.ts for usage')
	}
}

main()
	.catch(error => {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	})
	.finally(() => mysql.destroy())
