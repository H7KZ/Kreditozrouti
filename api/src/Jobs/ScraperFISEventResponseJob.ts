import { mysql } from '@api/clients'
import { CategoryTableName, EventCategoryTableName, EventTableName, NewEventCategory } from '@api/Database/types'
import { ScraperFISEventResponseJobInterface } from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Job } from 'bullmq'

/**
 * Processes the scraper response for a specific FIS event.
 * Upserts the event details into the database and synchronizes associated category relationships.
 *
 * @param job - The BullMQ job containing the scraped event data.
 */
export default async function ScraperFISEventResponseJob(job: Job<ScraperFISEventResponseJobInterface>): Promise<void> {
    const data = job.data.event

    if (!data?.id) {
        console.warn(`No valid event data found for job Id: ${job.id}`)
        return
    }

    const eventId = data.id
    console.log(`Processing sync for event Id: ${eventId}`)

    const formatDate = (dateStr: string | null | undefined) => (dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ') : null)

    const eventPayload = {
        id: eventId,
        title: data.title,
        subtitle: data.subtitle,
        datetime: formatDate(data.datetime),
        image_src: data.image.src,
        image_alt: data.image.alt,
        description: data.description,
        place: data.place,
        author: data.author,
        language: data.language,
        registration_from: formatDate(data.registration_from),
        registration_url: data.registration_url,
        substitute_url: data.substitute_url
    }

    await mysql
        .insertInto(EventTableName)
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

    await syncEventCategories(eventId, data.categories ?? [])

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
        await mysql.deleteFrom(EventCategoryTableName).where('event_id', '=', eventId).execute()
        return
    }

    for (const categoryId of incomingCategoryIds) {
        await mysql.insertInto(CategoryTableName).values({ id: categoryId }).onDuplicateKeyUpdate({ id: categoryId }).execute()
    }

    const existingRelations = await mysql.selectFrom(EventCategoryTableName).select('category_id').where('event_id', '=', eventId).execute()

    const existingIds = new Set(existingRelations.map(r => r.category_id))
    const incomingIds = new Set(incomingCategoryIds)

    const toDeleteIds = [...existingIds].filter(id => !incomingIds.has(id))

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(EventCategoryTableName).where('event_id', '=', eventId).where('category_id', 'in', toDeleteIds).execute()
    }

    const toInsert = [...incomingIds]
        .filter(id => !existingIds.has(id))
        .map(
            categoryId =>
                ({
                    event_id: eventId,
                    category_id: categoryId
                }) as NewEventCategory
        )

    if (toInsert.length > 0) {
        await mysql.insertInto(EventCategoryTableName).values(toInsert).execute()
    }
}
