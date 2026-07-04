import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import { Config } from '@mcp/Config/Config.js'
import type { DB } from './types.js'

export const db = new Kysely<DB>({
	dialect: new MysqlDialect({
		pool: createPool(Config.mysqlUri)
	})
})
