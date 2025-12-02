import { Kysely, sql } from 'kysely';

export async function up(mysql: Kysely<any>): Promise<void> {
    await mysql.schema
        .createTable('courses')
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull())
        .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`).notNull())
        .addColumn('ident', 'varchar(255)')
        .addColumn('title', 'varchar(255)')
        .addColumn('czech_title', 'varchar(255)')
        .addColumn('ects', 'integer')
        .addColumn('mode_of_delivery', 'varchar(255)')
        .addColumn('mode_of_completion', 'varchar(255)')
        .addColumn('language', 'varchar(255)')
        .addColumn('level', 'varchar(255)')
        .addColumn('year_of_study', 'integer')
        .addColumn('semester', 'varchar(255)')
        .addColumn('lecturers', 'text')
        .addColumn('prerequisites', 'text')
        .addColumn('co_requisites', 'text')
        .addColumn('recommended_programmes', 'text')
        .addColumn('required_work_experience', 'text')
        .addColumn('aims_of_the_course', 'text')
        .addColumn('learning_outcomes', 'text')
        .addColumn('course_contents', 'text')
        .addColumn('assessment_methods', 'text')
        .addColumn('special_requirements', 'text')
        .addColumn('literature', 'text')
        .addColumn('timetable', 'text')
        .execute();
}

export async function down(mysql: Kysely<any>): Promise<void> {
    await mysql.schema.dropTable("courses").execute();
}