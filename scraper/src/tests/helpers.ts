import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Returns `load`, `expected`, and `exists` functions scoped to a fixture directory.
 *
 * Usage:
 *   const { load, expected, exists } = makeFixtureLoaders(path.join(import.meta.dirname, 'fixtures/courses'))
 */
export function makeFixtureLoaders(dir: string) {
    return {
        load: (file: string): string => readFileSync(path.join(dir, file), 'utf8'),
        expected: <T>(file: string): T => JSON.parse(readFileSync(path.join(dir, file), 'utf8')) as T,
        exists: (file: string): boolean => existsSync(path.join(dir, file))
    }
}
