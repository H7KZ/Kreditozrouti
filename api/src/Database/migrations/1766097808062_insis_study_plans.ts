import { CourseTable, StudyPlanCourseTable, StudyPlanTable } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

/**
 * Applies the database schema migration.
 * Creates tables for Study Plans and their associated Course lists, linking them to existing Courses.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    /**
     * Creates the main Study Plan table storing metadata about the curriculum.
     */
    await mysql.schema
        .createTable(StudyPlanTable._table)
        .addColumn('id', 'integer', col => col.primaryKey())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('url', 'text', col => col.notNull())
        .addColumn('ident', 'varchar(64)')
        .addColumn('title', 'varchar(255)')
        .addColumn('faculty', 'varchar(255)')
        .addColumn('semester', 'varchar(64)')
        .addColumn('level', 'varchar(64)')
        .addColumn('mode_of_study', 'varchar(64)')
        .addColumn('study_length', 'varchar(64)')
        .execute()

    /**
     * Creates a normalized table to store the lists of courses associated with a plan.
     * Links 1:N with Study Plans and optionally 1:1 with Courses.
     */
    await mysql.schema
        .createTable(StudyPlanCourseTable._table)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('study_plan_id', 'integer', col => col.notNull().references(`${StudyPlanTable._table}.id`).onDelete('cascade'))
        .addColumn('course_id', 'integer', col => col.references(`${CourseTable._table}.id`).onDelete('set null'))
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('course_ident', 'varchar(32)', col => col.notNull())
        .addColumn('category', 'varchar(32)', col => col.notNull())
        .execute()
}

/**
 * Reverts the database schema migration.
 * Drops tables in reverse dependency order.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(StudyPlanCourseTable._table).execute()
    await mysql.schema.dropTable(StudyPlanTable._table).execute()
}
