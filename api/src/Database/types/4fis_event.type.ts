import { ColumnType, Insertable, Selectable } from 'kysely'

/**
 * Defines the schema structure for the Event table.
 */
export class EventTable {
    /** Database table name for events. */
    static readonly _table = '4fis_events' as const

    /** Unique string identifier for the event. */
    id!: string

    /** Record creation timestamp. */
    created_at!: ColumnType<Date, string | undefined, never>
    /** Record last update timestamp. */
    updated_at!: ColumnType<Date, string | undefined, string | undefined>

    // categories!: string[]

    /** Main title of the event. */
    title!: string | null
    /** Secondary title or tagline. */
    subtitle!: string | null
    /** Date and time when the event takes place. */
    datetime!: ColumnType<Date, string | null, string | null>
    /** URL path to the event's image. */
    image_src!: string | null
    /** Alternative text for the event image. */
    image_alt!: string | null
    /** Detailed description of the event. */
    description!: string | null
    /** Physical location or venue. */
    place!: string | null
    /** Name of the event organizer or author. */
    author!: string | null
    /** Language code for the event (e.g., 'en', 'cs'). */
    language!: string | null
    /** Start date/time for event registration. */
    registration_from!: ColumnType<Date, string | null, string | null>
    /** External URL for registration. */
    registration_url!: string | null
    /** Alternative URL if primary registration is unavailable. */
    substitute_url!: string | null
}

/** Type representing a selected event record. */
export type Event = Selectable<EventTable>
/** Type representing data required to insert a new event. */
export type NewEvent = Insertable<Omit<EventTable, 'id' | 'created_at' | 'updated_at'>>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Event-Category junction table.
 * Establishes a Many-to-Many relationship between Events and Categories.
 */
export class EventCategoryTable {
    /** Database table name for event-category relationships. */
    static readonly _table = '4fis_events_categories' as const

    /** Foreign key referencing the Event table. */
    event_id!: string
    /** Foreign key referencing the Category table. */
    category_id!: string
}

/** Type representing a selected event-category relationship. */
export type EventCategory = Selectable<EventCategoryTable>
/** Type representing data required to associate an event with a category. */
export type NewEventCategory = Insertable<EventCategoryTable>

// -------------------------------------------------------------------------

/**
 * Defines the schema structure for the Category table.
 */
export class CategoryTable {
    /** Database table name for categories. */
    static readonly _table = '4fis_categories' as const

    /** Unique string identifier for the category. */
    id!: string
}

/** Type representing a selected category record. */
export type Category = Selectable<CategoryTable>
/** Type representing data required to insert a new category. */
export type NewCategory = Insertable<CategoryTable>
