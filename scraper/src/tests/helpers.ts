import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Returns `load`, `expected`, and `exists` functions scoped to a fixture directory.
 *
 * Usage:
 *   const { load, expected, exists } = makeFixtureLoaders(path.join(import.meta.dirname, 'fixtures/courses'))
 *
 * `expected(file, fallback)` — if the JSON file is missing, writes `fallback` to disk and returns it.
 * This lets you drop in an HTML fixture, run tests, and get the expected JSON generated automatically
 * for manual review. On subsequent runs the saved file is used for the assertion.
 */
export function makeFixtureLoaders(dir: string) {
    return {
        load: (file: string): string => readFileSync(path.join(dir, file), 'utf8'),

        expected: <T>(file: string, fallback?: T): T => {
            const filePath = path.join(dir, file)
            if (!existsSync(filePath)) {
                if (fallback === undefined) throw new Error(`Missing expected fixture: ${file}`)
                writeFileSync(filePath, JSON.stringify(fallback, null, 4))
                console.warn(`\n  ⚠  Generated ${file} — review and edit if needed`)
                return fallback
            }
            return JSON.parse(readFileSync(filePath, 'utf8')) as T
        },

        exists: (file: string): boolean => existsSync(path.join(dir, file))
    }
}
