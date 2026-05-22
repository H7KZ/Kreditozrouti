# API — Database

The API uses **Kysely** as a type-safe SQL query builder over MySQL 8. Kysely is NOT an ORM — it has no models, no
auto-migrations, and no relationship tracking. You write SQL via a typed builder; Kysely validates it at compile time.

---

## Schema

### `insis_faculties`

| Column                         | Type               | Notes                                              |
|--------------------------------|--------------------|----------------------------------------------------|
| `id`                           | `varchar` PK       | Faculty ident, e.g. `"FIS"`, `"NF"`                |
| `title`                        | `varchar` nullable | Full faculty name                                  |
| `is_schedule_publicly_visible` | `boolean`          | False for CTVS≥2017, OZS≥2020, IOM≥2021, CESP≥2022 |
| `created_at`                   | `timestamp`        | Auto-set on insert                                 |
| `updated_at`                   | `timestamp`        | Updated on each sync                               |

---

### `insis_courses`

| Column               | Type                                | Notes                                           |
|----------------------|-------------------------------------|-------------------------------------------------|
| `id`                 | `int` auto PK                       |                                                 |
| `faculty_id`         | `varchar` FK → `insis_faculties.id` |                                                 |
| `url`                | `varchar`                           | Full InSIS syllabus URL                         |
| `ident`              | `varchar` unique                    | Course code, e.g. `"4IT101"`                    |
| `title`              | `varchar` nullable                  | Title in language of instruction                |
| `title_cs`           | `varchar` nullable                  | Czech title                                     |
| `title_en`           | `varchar` nullable                  | English title                                   |
| `ects`               | `int` nullable                      | Credit value                                    |
| `mode_of_delivery`   | `varchar` nullable                  | e.g. `"prezenční"`                              |
| `mode_of_completion` | `varchar` nullable                  | e.g. `"zkouška"`                                |
| `languages`          | `text` nullable                     | **Pipe-delimited** e.g. `"čeština\|angličtina"` |
| `level`              | `varchar` nullable                  | e.g. `"bakalářský"`                             |
| `year_of_study`      | `int` nullable                      | Recommended year (1–5)                          |
| `semester`           | `enum('ZS','LS')` nullable          |                                                 |
| `year`               | `int` nullable                      | Starting year of academic year                  |
| `lecturers`          | `text` nullable                     | **Pipe-delimited**                              |
| Long-text fields     | `text` nullable                     | `prerequisites`, `aims_of_the_course`, etc.     |

**Pipe-delimited fields:** `languages` and `lecturers` are stored as `|`-separated strings and parsed in the service
layer. This avoids a separate join table for what are effectively display strings.

---

### `insis_courses_assessments`

| Column      | Type                    | Notes                    |
|-------------|-------------------------|--------------------------|
| `id`        | `int` auto PK           |                          |
| `course_id` | `int` FK CASCADE DELETE |                          |
| `method`    | `varchar` nullable      | e.g. `"Zkouška písemná"` |
| `weight`    | `int` nullable          | Percentage (0–100)       |

---

### `insis_courses_units`

One row per timetable unit (lecture group / seminar group).

| Column      | Type                    | Notes                                  |
|-------------|-------------------------|----------------------------------------|
| `id`        | `int` auto PK           |                                        |
| `course_id` | `int` FK CASCADE DELETE |                                        |
| `type`      | `varchar` nullable      | `"lecture"`, `"exercise"`, `"seminar"` |
| `lecturer`  | `varchar` nullable      |                                        |
| `capacity`  | `int` nullable          | Max enrollment                         |
| `note`      | `text` nullable         |                                        |

---

### `insis_courses_units_slots`

One row per time slot within a unit.

| Column      | Type                                     | Notes                              |
|-------------|------------------------------------------|------------------------------------|
| `id`        | `int` auto PK                            |                                    |
| `unit_id`   | `int` FK CASCADE DELETE                  |                                    |
| `type`      | `enum('regular','irregular','one_time')` |                                    |
| `frequency` | `varchar` nullable                       | `"weekly"`, `"single"`             |
| `date`      | `date` nullable                          | For one-time occurrences           |
| `day`       | `enum(InSISDay)` nullable                | Czech day name for recurring slots |
| `time_from` | `int`                                    | **Minutes from midnight**          |
| `time_to`   | `int`                                    | **Minutes from midnight**          |
| `location`  | `varchar` nullable                       | Room/building, e.g. `"NB 169"`     |

---

### `insis_study_plans`

| Column          | Type                       | Notes                      |
|-----------------|----------------------------|----------------------------|
| `id`            | `int` auto PK              |                            |
| `faculty_id`    | `varchar` FK               |                            |
| `ident`         | `varchar`                  | Plan code, e.g. `"B-AIN1"` |
| `title`         | `varchar` nullable         |                            |
| `semester`      | `enum('ZS','LS')` nullable |                            |
| `year`          | `int` nullable             |                            |
| `level`         | `varchar` nullable         | e.g. `"bakalářský"`        |
| `mode_of_study` | `varchar` nullable         |                            |
| `study_length`  | `varchar` nullable         | e.g. `"3 roky"`            |

---

### `insis_study_plans_courses`

Many-to-many junction: which courses appear in which study plans.

| Column          | Type                    | Notes                             |
|-----------------|-------------------------|-----------------------------------|
| `id`            | `int` auto PK           |                                   |
| `study_plan_id` | `int` FK CASCADE DELETE |                                   |
| `course_id`     | `int` FK nullable       | Null if course not yet scraped    |
| `course_ident`  | `varchar`               | Cached ident for deferred linking |
| `group`         | `varchar`               | `InSISStudyPlanCourseGroup`       |
| `category`      | `varchar`               | `InSISStudyPlanCourseCategory`    |

The `course_ident` column exists as a fallback: when a study plan is synced before the corresponding course is scraped,
`course_id` is null but `course_ident` is recorded. When the course is later scraped,
`ScraperResponseInSISCourseJob.syncStudyPlansFromCourse` fills in the `course_id`.

---

## Time Encoding

All slot times are stored as **minutes from midnight** (integer 0–1439):

```
00:00 →    0
08:00 →  480
09:15 →  555
17:45 → 1065
23:59 → 1439
```

Conversion:

```typescript
// DB write (in ScraperResponseInSISCourseJob)
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

// Display (in client/src/composables/useTimeUtils.ts)
function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
```

Time comparisons in SQL (`time_from < exc.time_to AND time_to > exc.time_from`) work correctly because integers compare
naturally.

---

## Migrations

Migrations run **automatically** on every API startup via `SQLService.migrateToLatest()`. Kysely tracks which migrations
have run in a `kysely_migration` table (created automatically).

**File naming:** Files are sorted lexicographically, so use numeric prefixes or ISO timestamps:

```
0001_insis_faculties.ts
0002_insis_courses.ts
20260122151133_insis_courses_unit_id.ts
```

**Migration template:**

```typescript
import {Kysely, sql} from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
    await db.schema
        .createTable('new_table')
        .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
        .addColumn('name', 'varchar(255)', col => col.notNull())
        .addColumn('created_at', 'timestamp', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
        .execute()
}

export async function down(db: Kysely<any>): Promise<void> {
    await db.schema.dropTable('new_table').execute()
}
```

After creating a migration file, restart the API to apply it.

After a migration changes the schema, update `Database/types.ts` with the corresponding TypeScript interfaces.

---

## Kysely Query Patterns

```typescript
// Select with filter
const courses = await mysql
    .selectFrom('insis_courses')
    .selectAll()
    .where('faculty_id', '=', 'FIS')
    .orderBy('ident', 'asc')
    .limit(20)
    .execute()

// Upsert (MySQL ON DUPLICATE KEY UPDATE)
await mysql
    .insertInto('insis_courses')
    .values({ident: '4IT101', title_cs: 'Java', ...})
    .onConflict(oc => oc.column('ident').doUpdateSet({title_cs: '4IT101'}))
    .execute()

// Subquery relation (jsonArrayFrom)
const result = await mysql
    .selectFrom('insis_courses as c')
    .selectAll('c')
    .select(eb => [
        jsonArrayFrom(
            eb.selectFrom('insis_courses_units as u')
                .selectAll('u')
                .whereRef('u.course_id', '=', 'c.id')
        ).as('units')
    ])
    .execute()

// Transaction
await mysql.transaction().execute(async trx => {
    await trx.insertInto('insis_faculties').values(...).execute()
    await trx.insertInto('insis_courses').values(...).execute()
})
```

---

## Database `types.ts` Structure

All table interfaces live in a single file (`Database/types.ts`). Each table uses a `class` with
`static readonly _table` for the table name constant, plus Kysely's `ColumnType`, `Generated`, `Selectable`, and
`Insertable` helpers:

```typescript
export class CourseTable {
    static readonly _table = 'insis_courses' as const
    id!: Generated<number>
    ident!: string
    // ...
}

export type Course = Selectable<CourseTable>
export type NewCourse = Insertable<CourseTable>
```

**Do not import `Database/types.ts` from the client.** All shared types the client needs are in `@shared/`.
