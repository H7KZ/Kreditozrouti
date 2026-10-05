import { Kysely, sql } from 'kysely'
import { CourseTable, StudyPlanCourseIdentTable, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { createUniqueIndexSafe, dropIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// 1. Create study_plans_course_idents
	await db.schema
		.createTable(StudyPlanCourseIdentTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
		.addColumn('study_plan_id', 'integer', col => col.notNull().references(`${StudyPlanTable._table}.id`).onDelete('cascade'))
		.addColumn('course_ident', 'varchar(32)', col => col.notNull())
		.addColumn('group', 'varchar(32)', col => col.notNull())
		.addColumn('category', 'varchar(32)', col => col.notNull())
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.execute()

	await createUniqueIndexSafe(db, 'idx_spc_idents_unique', StudyPlanCourseIdentTable._table, ['study_plan_id', 'course_ident'])

	// 2. Backfill from study_plan_courses (one row per study_plan_id+course_ident, keep lowest id)
	await sql`
        INSERT IGNORE INTO ${sql.table(StudyPlanCourseIdentTable._table)}
            (study_plan_id, course_ident, \`group\`, category)
        SELECT study_plan_id, course_ident, \`group\`, category
        FROM ${sql.table(StudyPlanCourseTable._table)}
    `.execute(db)

	// 3. Delete null course_id rows from study_plan_courses
	await sql`
        DELETE FROM ${sql.table(StudyPlanCourseTable._table)} WHERE course_id IS NULL
    `.execute(db)

	// 4. Drop the old FK on course_id (was ON DELETE SET NULL) so we can change the column
	const fkResult = await sql<{ CONSTRAINT_NAME: string }>`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ${StudyPlanCourseTable._table}
          AND COLUMN_NAME = 'course_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    `.execute(db)

	if (fkResult.rows.length > 0) {
		const fkName = fkResult.rows[0].CONSTRAINT_NAME
		await sql.raw(`ALTER TABLE \`${StudyPlanCourseTable._table}\` DROP FOREIGN KEY \`${fkName}\``).execute(db)
	}

	// 5. Make course_id NOT NULL
	await sql.raw(`ALTER TABLE \`${StudyPlanCourseTable._table}\` MODIFY course_id INT NOT NULL`).execute(db)

	// 6. Re-add FK with CASCADE so deleting a course cleans up its links
	await sql
		.raw(
			`
        ALTER TABLE \`${StudyPlanCourseTable._table}\`
        ADD CONSTRAINT fk_spc_course_cascade
        FOREIGN KEY (course_id) REFERENCES \`${CourseTable._table}\`(id) ON DELETE CASCADE
    `
		)
		.execute(db)
}

export async function down(db: Kysely<any>): Promise<void> {
	// Restore nullable FK
	const fkResult = await sql<{ CONSTRAINT_NAME: string }>`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ${StudyPlanCourseTable._table}
          AND COLUMN_NAME = 'course_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
        LIMIT 1
    `.execute(db)

	if (fkResult.rows.length > 0) {
		const fkName = fkResult.rows[0].CONSTRAINT_NAME
		await sql.raw(`ALTER TABLE \`${StudyPlanCourseTable._table}\` DROP FOREIGN KEY \`${fkName}\``).execute(db)
	}

	await sql.raw(`ALTER TABLE \`${StudyPlanCourseTable._table}\` MODIFY course_id INT NULL`).execute(db)

	await sql
		.raw(
			`
        ALTER TABLE \`${StudyPlanCourseTable._table}\`
        ADD CONSTRAINT fk_spc_course_nullable
        FOREIGN KEY (course_id) REFERENCES \`${CourseTable._table}\`(id) ON DELETE SET NULL
    `
		)
		.execute(db)

	await dropIndexSafe(db, 'idx_spc_idents_unique', StudyPlanCourseIdentTable._table)
	await db.schema.dropTable(StudyPlanCourseIdentTable._table).ifExists().execute()
}
