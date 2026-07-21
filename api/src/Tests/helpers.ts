import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export function makeFixtureLoaders(dir: string) {
	return {
		load: (file: string): string => readFileSync(path.join(dir, file), 'utf8'),

		expected: <T>(file: string, fallback?: T): T => {
			const filePath = path.join(dir, file)
			const forceRegen = process.env.FORCE_FIXTURES === '1'

			if (!existsSync(filePath) || forceRegen) {
				if (fallback === undefined) throw new Error(`Missing expected fixture: ${file}`)
				writeFileSync(filePath, JSON.stringify(fallback, null, 4))
				if (forceRegen) console.warn(`\n  Regenerated ${file}`)
				else console.warn(`\n  Generated ${file} — review and edit if needed`)
				return fallback
			}
			return JSON.parse(readFileSync(filePath, 'utf8')) as T
		},

		exists: (file: string): boolean => existsSync(path.join(dir, file))
	}
}
