import { CategoryTable, EventCategoryTable, EventTable } from './event.type'
import { UserTable } from './user.type'

export * from './user.type'
export * from './event.type'

export interface Database {
    users: UserTable
    events: EventTable
    events_categories: EventCategoryTable
    categories: CategoryTable
}
