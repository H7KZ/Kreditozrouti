import { mysql } from '@api/clients'
import { Event, EventTable, NewEvent } from '@api/Database/types'
import { sql } from 'kysely'

/**
 * Service class for Event database operations.
 * Handles all CRUD operations for events.
 */
export class EventService {
    /**
     * Get all events within a date range
     */
    public static async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
        return mysql
            .selectFrom(EventTable._table)
            .selectAll()
            .where(eb =>
                eb.or([
                    // Events that start within the range
                    eb.and([
                        eb('datetime', '>=', startDate),
                        eb('datetime', '<=', endDate)
                    ]),
                    // For events with start/end, we'd need to adjust the schema
                    // Currently the schema only has 'datetime', so we filter by that
                ])
            )
            .orderBy('datetime', 'asc')
            .execute()
    }

    /**
     * Get a single event by ID
     */
    public static async getEventById(id: string): Promise<Event | undefined> {
        return mysql
            .selectFrom(EventTable._table)
            .selectAll()
            .where('id', '=', id)
            .executeTakeFirst()
    }

    /**
     * Create a new event
     */
    public static async createEvent(data: NewEvent & { id: string }): Promise<Event> {
        await mysql
            .insertInto(EventTable._table)
            .values(data)
            .execute()

        // Fetch and return the created event
        const event = await this.getEventById(data.id)
        if (!event) {
            throw new Error('Failed to create event')
        }
        return event
    }

    /**
     * Update an event
     */
    public static async updateEvent(id: string, data: Partial<NewEvent>): Promise<Event> {
        await mysql
            .updateTable(EventTable._table)
            .set(data)
            .where('id', '=', id)
            .execute()

        // Fetch and return the updated event
        const event = await this.getEventById(id)
        if (!event) {
            throw new Error('Event not found')
        }
        return event
    }

    /**
     * Delete an event
     */
    public static async deleteEvent(id: string): Promise<void> {
        await mysql
            .deleteFrom(EventTable._table)
            .where('id', '=', id)
            .execute()
    }
}

