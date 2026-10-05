import { Kysely, sql } from 'kysely'
import { CourseLecturerTable, CourseTable, FacultyTable, LecturerTable } from '@api/Database/types'
import { addColumnSafe, createIndexSafe } from './utils'

export async function up(db: Kysely<any>): Promise<void> {
	// Lecturers are keyed by the InSIS person id, so the primary key is not generated.
	await db.schema
		.createTable(LecturerTable._table)
		.ifNotExists()
		.addColumn('id', 'integer', col => col.primaryKey())
		.addColumn('name', 'varchar(255)', col => col.notNull())
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
		.execute()

	await db.schema
		.createTable(CourseLecturerTable._table)
		.ifNotExists()
		.addColumn('course_id', 'integer', col => col.notNull().references(`${CourseTable._table}.id`).onDelete('cascade'))
		.addColumn('lecturer_id', 'integer', col => col.notNull().references(`${LecturerTable._table}.id`).onDelete('cascade'))
		.addColumn('role', 'varchar(16)', col => col.notNull())
		.addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
		.addPrimaryKeyConstraint('pk_courses_lecturers', ['course_id', 'lecturer_id'])
		.execute()

	await createIndexSafe(db, 'idx_courses_lecturers_lecturer', CourseLecturerTable._table, ['lecturer_id'])

	// NULL means "no scrape has confirmed the visibility flag yet"; the partner API hides such faculties.
	await addColumnSafe(db, FacultyTable._table, 'schedule_visibility_checked_at', 'DATETIME NULL')
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable(CourseLecturerTable._table).ifExists().execute()
	await db.schema.dropTable(LecturerTable._table).ifExists().execute()
	await db.schema
		.alterTable(FacultyTable._table)
		.dropColumn('schedule_visibility_checked_at')
		.execute()
		.catch(() => {
			/* empty */
		})
}
