import { promises as fs } from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'
import { mysql } from '@api/clients'
import { Paths } from '@api/paths'
import { FileMigrationProvider, Migrator } from 'kysely'

/**
 * Service responsible for database schema management and initial data seeding.
 */
export class SQLService {
	/**
	 * Executes pending migrations to bring the database schema up to date.
	 * Terminating the process with exit code 1 if a critical error occurs.
	 *
	 * @throws {Error} If the database client is not initialized.
	 */
	static async migrateToLatest() {
		if (!mysql) throw new Error('Database client is not initialized')

		const migrator = new Migrator({
			db: mysql,
			provider: new FileMigrationProvider({
				fs,
				path,
				migrationFolder: Paths.Database.migrations
			})
		})

		const { results, error } = await migrator.migrateToLatest()

		results?.forEach(it => {
			if (it.status === 'Success') {
				console.log(`migration "${it.migrationName}" was executed successfully`)
			} else if (it.status === 'Error') {
				console.error(`failed to execute migration "${it.migrationName}"`)
			}
		})

		if (error) {
			console.error('failed to migrate')
			console.error(error)
			process.exit(1)
		}
	}

	/**
	 * Dynamically imports and executes seed scripts from the seeds directory.
	 * Supports .js, .ts, .mjs, and .mts files.
	 *
	 * @throws {Error} If the database client is not initialized.
	 */
	static async seedInitialData() {
		if (!mysql) throw new Error('Database client is not initialized')

		const seedFiles = await fs.readdir(Paths.Database.seeds)

		for (const file of seedFiles) {
			const isScript =
				file.endsWith('.js') ||
				(file.endsWith('.ts') && !file.endsWith('.d.ts')) ||
				file.endsWith('.mjs') ||
				(file.endsWith('.mts') && !file.endsWith('.d.mts'))

			if (!isScript) continue

			const filePath = path.join(Paths.Database.seeds, file)
			const fileURL = pathToFileURL(filePath).href

			const seedModule = (await import(fileURL)) as { seed: (db: typeof mysql) => Promise<void> }

			if (typeof seedModule.seed !== 'function') continue

			try {
				await seedModule.seed(mysql)
				console.log(`Seed "${file}" executed successfully`)
			} catch (error) {
				if (error instanceof Error) console.error(`Failed to execute seed "${file}"`)
			}
		}
	}
}
