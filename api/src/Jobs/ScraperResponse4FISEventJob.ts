import { mysql } from '@api/clients'
import { CategoryTable, EventCategoryTable, EventTable } from '@api/Database/types'
import { Scraper4FISEventResponseJob } from '@scraper/Interfaces/ScraperResponseJob'

/**
 * Processes the scraper response for a specific FIS event.
 * Upserts the event details into the database and synchronizes associated category relationships.
 *
 * @param data - The scraper response job data containing event details.
 */
export default async function ScraperResponse4FISEventJob(data: Scraper4FISEventResponseJob): Promise<void> {
    const event = data.event

    if (!event?.id) {
        return
    }

    const eventId = event.id
    console.log(`Processing sync for event Id: ${eventId}`)

    const formatDate = (dateStr: string | null | undefined) => (dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ') : null)

    const eventPayload = {
        id: eventId,
        title: event.title,
        subtitle: event.subtitle,
        datetime: formatDate(event.datetime),
        image_src: event.image.src,
        image_alt: event.image.alt,
        description: event.description,
        place: event.place,
        author: event.author,
        language: event.language,
        registration_from: formatDate(event.registration_from),
        registration_url: event.registration_url,
        substitute_url: event.substitute_url
    }

    await mysql
        .insertInto(EventTable._table)
        .values(eventPayload)
        .onDuplicateKeyUpdate({
            title: eventPayload.title,
            subtitle: eventPayload.subtitle,
            datetime: eventPayload.datetime,
            image_src: eventPayload.image_src,
            image_alt: eventPayload.image_alt,
            description: eventPayload.description,
            place: eventPayload.place,
            author: eventPayload.author,
            language: eventPayload.language,
            registration_from: eventPayload.registration_from,
            registration_url: eventPayload.registration_url,
            substitute_url: eventPayload.substitute_url
        })
        .execute()

    await syncEventCategories(eventId, event.categories ?? [])

    console.log(`Synced event Id: ${eventId}`)
}

/**
 * Reconciles the Many-to-Many relationships between an event and its categories.
 * Ensures referenced categories exist, removes stale associations, and creates new links.
 *
 * @param eventId - The unique identifier of the event.
 * @param incomingCategoryIds - The list of category IDs returned by the scraper.
 */
async function syncEventCategories(eventId: string, incomingCategoryIds: string[]): Promise<void> {
    if (incomingCategoryIds.length === 0) {
        await mysql.deleteFrom(EventCategoryTable._table).where('event_id', '=', eventId).execute()
        return
    }

    for (const categoryId of incomingCategoryIds) {
        await mysql.insertInto(CategoryTable._table).values({ id: categoryId }).onDuplicateKeyUpdate({ id: categoryId }).execute()
    }

    const existingRelations = await mysql.selectFrom(EventCategoryTable._table).select('category_id').where('event_id', '=', eventId).execute()

    const existingIds = new Set(existingRelations.map(r => r.category_id))
    const incomingIds = new Set(incomingCategoryIds)

    const toDeleteIds = [...existingIds].filter(id => !incomingIds.has(id))

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(EventCategoryTable._table).where('event_id', '=', eventId).where('category_id', 'in', toDeleteIds).execute()
    }

    const toInsert = [...incomingIds].filter(id => !existingIds.has(id)).map(categoryId => ({ event_id: eventId, category_id: categoryId }))

    if (toInsert.length > 0) {
        await mysql.insertInto(EventCategoryTable._table).values(toInsert).execute()
    }
}
