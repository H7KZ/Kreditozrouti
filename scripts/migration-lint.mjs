#!/usr/bin/env node
/**
 * Fails when a new migration's `up` removes or renames something (expand-only migrations).
 *
 * The api migrates on boot, and the toolkit rolls a failed release back to the previous images
 * automatically. The previous code then runs against the new schema, so a release may only add:
 * tables, nullable columns or columns with defaults, indexes. Drops and renames wait for a later
 * release, once nothing that could be rolled back to still reads them. Migrations up to BASELINE
 * predate the rule. A deliberate exception carries the comment
 * `// migration-lint: allow-destructive <reason>` in the file (and a maintenance window).
 *
 * Usage (from anywhere inside the repo, any shell):
 *   node scripts/migration-lint.mjs
 */
import { readdirSync, readFileSync } from 'node:fs'

const MIGRATIONS = new URL('../apps/api/src/Database/migrations/', import.meta.url)
const BASELINE = '20261005000002'
const FILE = /^(\d{14})_.+\.ts$/
const DESTRUCTIVE = [
	/\.dropTable\(/,
	/\.dropColumn\(/,
	/\.renameColumn\(/,
	/\.renameTo\(/,
	/\.modifyColumn\(/,
	/\.dropIndex\(/,
	/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i,
	/\bRENAME\s+(TABLE|COLUMN|TO)\b/i,
	/\bMODIFY\s+COLUMN\b/i
]
const ALLOW = /\/\/ migration-lint: allow-destructive \S/

let failures = 0
for (const file of readdirSync(MIGRATIONS).sort()) {
	const stamp = FILE.exec(file)?.[1]
	if (!stamp || stamp <= BASELINE) continue
	const source = readFileSync(new URL(file, MIGRATIONS), 'utf8')
	if (ALLOW.test(source)) continue
	const start = source.indexOf('export async function up')
	const end = source.indexOf('export async function down')
	const up = source.slice(start === -1 ? 0 : start, end === -1 ? undefined : end)
	for (const pattern of DESTRUCTIVE) {
		if (pattern.test(up)) {
			console.error(`${file}: up() matches ${pattern} — migrations must only add (see scripts/migration-lint.mjs)`)
			failures += 1
		}
	}
}
if (failures > 0) process.exitCode = 1
else console.log('migration-lint: every new migration only adds')
