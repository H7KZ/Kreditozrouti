import type { Database as DB } from '@kreditozrouti/types'
import { Kysely, MysqlDialect } from 'kysely'
import { createPool } from 'mysql2'
import Config from '@mcp/Config/Config'

export const db = new Kysely<DB>({
	dialect: new MysqlDialect({
		pool: createPool(Config.mysqlUri)
	})
})
