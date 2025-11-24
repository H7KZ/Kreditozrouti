import { ColumnType, Selectable } from 'kysely'

export interface EventTable {
    id: string

    created_at: ColumnType<Date, string | undefined, never>
    updated_at: ColumnType<Date, string | undefined, string | undefined>

    title: string | null
    subtitle: string | null
    datetime: ColumnType<Date, string | null, string | null>
    image_src: string | null
    image_alt: string | null
    description: string | null
    place: string | null
    author: string | null
    language: string | null
    registration_from: ColumnType<Date, string | null, string | null>
    registration_url: string | null
    substitute_url: string | null
}

export type Event = Selectable<EventTable>

export interface EventCategoryTable {
    event_id: string
    category_id: string
}

export type EventCategory = Selectable<EventCategoryTable>

export interface CategoryTable {
    id: string
}

export type Category = Selectable<CategoryTable>
