/// <reference types="node" />
// Node-only module: the browser bundle never imports `@kreditozrouti/core/partner-api`.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Literal prefix of every key. Lets secret scanners and humans recognise a leaked key. */
export const API_KEY_PREFIX = 'kz_live_'

/** Characters of the secret part kept as a lookup id. Not secret by itself, shown in admin tooling. */
const LOOKUP_LENGTH = 8

// 32 random bytes encode to 43 base64url characters.
const KEY_PATTERN = /^kz_live_([\w-]{43})$/

export interface GeneratedApiKey {
	/** The full key. Shown to the owner once and never stored. */
	key: string
	/** Lookup id, stored in plain text next to the hash. */
	prefix: string
	/** Hex SHA-256 of the full key, the only form that is stored. */
	hash: string
}

export interface ParsedApiKey {
	key: string
	prefix: string
}

/**
 * Hex SHA-256 of a key. A fast hash is enough because the key carries 256 bits of entropy, so there is
 * nothing for a slow hash to protect against.
 */
export function hashApiKey(key: string): string {
	return createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): GeneratedApiKey {
	const secret = randomBytes(32).toString('base64url')
	const key = `${API_KEY_PREFIX}${secret}`

	return { key, prefix: secret.slice(0, LOOKUP_LENGTH), hash: hashApiKey(key) }
}

/** Splits a raw key into its lookup id. Returns null when the shape is wrong, so malformed input never reaches the database. */
export function parseApiKey(raw: string | undefined | null): ParsedApiKey | null {
	if (!raw) return null

	const match = KEY_PATTERN.exec(raw)
	if (!match?.[1]) return null

	return { key: raw, prefix: match[1].slice(0, LOOKUP_LENGTH) }
}

/** Reads the token from an `Authorization: Bearer <token>` header (RFC 6750). */
export function extractBearerToken(header: string | undefined | null): string | null {
	if (!header) return null

	const match = /^Bearer +(\S+)$/i.exec(header.trim())
	return match?.[1] ?? null
}

/** Constant-time comparison of a presented key against a stored hex SHA-256. */
export function apiKeyMatchesHash(key: string, expectedHash: string): boolean {
	const presented = Buffer.from(hashApiKey(key), 'hex')
	const expected = Buffer.from(expectedHash, 'hex')

	return presented.length === expected.length && timingSafeEqual(presented, expected)
}
