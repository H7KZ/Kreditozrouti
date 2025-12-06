import { CourseAssessmentMethodTableName, CourseTableName, CourseTimetableSlotTableName, CourseTimetableUnitTableName } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

/**
 * Applies the database schema migration.
 * Creates tables for Courses, Assessment Methods, Timetable Units, and Timetable Slots with established foreign key relationships.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function up(mysql: Kysely<any>): Promise<void> {
    /**
     * Creates the central Course table storing academic details, metadata, and curriculum information.
     */
    await mysql.schema
        .createTable(CourseTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('ident', 'varchar(32)', col => col.notNull())
        .addColumn('title', 'varchar(255)')
        .addColumn('czech_title', 'varchar(255)')
        .addColumn('ects', 'smallint', col => col.unsigned())
        .addColumn('mode_of_delivery', 'varchar(255)')
        .addColumn('mode_of_completion', 'varchar(255)')
        .addColumn('language', 'varchar(255)')
        .addColumn('level', 'varchar(255)')
        .addColumn('year_of_study', 'varchar(255)')
        .addColumn('semester', 'varchar(255)')
        .addColumn('lecturers', 'text')
        .addColumn('prerequisites', 'text')
        .addColumn('recommended_programmes', 'text')
        .addColumn('required_work_experience', 'text')
        .addColumn('aims_of_the_course', 'text')
        .addColumn('learning_outcomes', 'text')
        .addColumn('course_contents', 'text')
        .addColumn('special_requirements', 'text')
        .addColumn('literature', 'text')
        .execute()

    /**
     * Creates a table for course assessment criteria (methods and weights).
     * Links to the main Course table via Foreign Key.
     */
    await mysql.schema
        .createTable(CourseAssessmentMethodTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('course_id', 'integer', col => col.notNull().references(`${CourseTableName}.id`).onDelete('cascade'))
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('method', 'varchar(255)')
        .addColumn('weight', 'smallint', col => col.unsigned())
        .execute()

    /**
     * Creates a table for timetable units representing specific course instances or teaching groups.
     * Links to the main Course table via Foreign Key.
     */
    await mysql.schema
        .createTable(CourseTimetableUnitTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('course_id', 'integer', col => col.notNull().references(`${CourseTableName}.id`).onDelete('cascade'))
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('lecturer', 'varchar(255)')
        .addColumn('capacity', 'smallint', col => col.unsigned())
        .addColumn('note', 'text')
        .execute()

    /**
     * Creates a table for specific scheduling slots (time, location, frequency) associated with a timetable unit.
     * Links to the Timetable Unit table via Foreign Key.
     */
    await mysql.schema
        .createTable(CourseTimetableSlotTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('timetable_unit_id', 'integer', col => col.notNull().references(`${CourseTimetableUnitTableName}.id`).onDelete('cascade'))
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('type', 'varchar(255)')
        .addColumn('frequency', 'varchar(32)')
        .addColumn('date', 'varchar(255)')
        .addColumn('day', 'varchar(255)')
        .addColumn('time_from', 'varchar(255)')
        .addColumn('time_to', 'varchar(255)')
        .addColumn('time_from_minutes', 'smallint', col => col.unsigned())
        .addColumn('time_to_minutes', 'smallint', col => col.unsigned())
        .addColumn('location', 'varchar(255)')
        .execute()
}

/**
 * Reverts the database schema migration.
 * Drops course-related tables in reverse dependency order to satisfy foreign key constraints.
 *
 * @param mysql - The Kysely database instance used to execute schema queries.
 */
export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(CourseTimetableSlotTableName).execute()
    await mysql.schema.dropTable(CourseTimetableUnitTableName).execute()
    await mysql.schema.dropTable(CourseAssessmentMethodTableName).execute()
    await mysql.schema.dropTable(CourseTableName).execute()
}
