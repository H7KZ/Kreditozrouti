import { ColumnType, Insertable, Selectable } from 'kysely'

/**
 * Database schema for 4FIS Events.
 */
export class EventTable {
    static readonly _table = '4fis_events' as const

    id!: string

    created_at!: ColumnType<Date, string | undefined, never>
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    title!: string | null
    subtitle!: string | null
    datetime!: ColumnType<Date, string | null, string | null>

    image_src!: string | null
    image_alt!: string | null

    description!: string | null
    place!: string | null
    author!: string | null

    /** Language code (e.g., 'en', 'cs'). */
    language!: string | null

    registration_from!: ColumnType<Date, string | null, string | null>
    registration_url!: string | null
    substitute_url!: string | null
}

export type Event = Selectable<EventTable>
export type NewEvent = Insertable<Omit<EventTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Junction table for Event-Category relationships.
 */
export class EventCategoryTable {
    static readonly _table = '4fis_events_categories' as const

    event_id!: string
    category_id!: string
}

export type EventCategory = Selectable<EventCategoryTable>
export type NewEventCategory = Insertable<EventCategoryTable>

// -------------------------------------------------------------------------

/**
 * Database schema for Event Categories.
 */
export class CategoryTable {
    static readonly _table = '4fis_categories' as const

    id!: string
}

export type Category = Selectable<CategoryTable>
export type NewCategory = Insertable<CategoryTable>
