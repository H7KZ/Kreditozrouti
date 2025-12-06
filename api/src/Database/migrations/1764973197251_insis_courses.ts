import { CourseAssessmentMethodTableName, CourseTableName, CourseTimetableSlotTableName, CourseTimetableUnitTableName } from '@api/Database/types'
import { Kysely, sql } from 'kysely'

export async function up(mysql: Kysely<any>): Promise<void> {
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

    await mysql.schema
        .createTable(CourseAssessmentMethodTableName)
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('course_id', 'integer', col => col.notNull().references(`${CourseTableName}.id`).onDelete('cascade'))
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('method', 'varchar(255)')
        .addColumn('weight', 'smallint', col => col.unsigned())
        .execute()

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

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable(CourseTimetableSlotTableName).execute()
    await mysql.schema.dropTable(CourseTimetableUnitTableName).execute()
    await mysql.schema.dropTable(CourseAssessmentMethodTableName).execute()
    await mysql.schema.dropTable(CourseTableName).execute()
}
