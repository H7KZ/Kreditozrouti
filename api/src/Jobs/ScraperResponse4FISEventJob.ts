import { mysql } from '@api/clients'
import { CategoryTable, EventCategoryTable, EventTable } from '@api/Database/types'
import SimilarityService from '@api/Services/SimilarityService'
import { Scraper4FISEventResponseJob } from '@scraper/Interfaces/ScraperResponseJob'
import LoggerService from '@scraper/Services/LoggerService'

/**
 * Syncs a scraped FIS event into the database.
 * Handles identity resolution via:
 * 1. Exact ID Match: Checks if the external ID already exists.
 * 2. Fuzzy Match: Checks for similar titles within a +/- 1 day time window to handle duplicates
 * caused by naming variations or timezone shifts (e.g., "Event" vs "4FIS: Event").
 */
export default async function ScraperResponse4FISEventJob(data: Scraper4FISEventResponseJob): Promise<void> {
    const { event } = data
    const logger = new LoggerService('[4FIS:Response:Event]')

    if (!event?.id) return

    const incomingId = event.id
    const incomingDate = event.datetime ? new Date(event.datetime) : null
    const incomingTitle = event.title ?? ''

    logger.log(`Processing sync for event Id: ${incomingId} - ${incomingTitle}`)

    let targetEventId: string | null = null

    // 1. Check for Exact ID Match
    const existingById = await mysql.selectFrom(EventTable._table).select('id').where('id', '=', incomingId).executeTakeFirst()

    if (existingById) {
        targetEventId = existingById.id
    } else if (incomingDate && incomingTitle) {
        // 2. Fuzzy Match
        // We look for events within a +/- 24h window to account for timezone differences
        // (e.g., Flickr often reports 23:00 of the previous day).
        const minDate = new Date(incomingDate)
        minDate.setHours(minDate.getHours() - 24)

        const maxDate = new Date(incomingDate)
        maxDate.setHours(maxDate.getHours() + 24)

        const candidates = await mysql
            .selectFrom(EventTable._table)
            .select(['id', 'title'])
            .where('datetime', '>=', minDate)
            .where('datetime', '<=', maxDate)
            .execute()

        for (const candidate of candidates) {
            if (!candidate.title) continue

            if (SimilarityService.areTitlesSimilar(incomingTitle, candidate.title)) {
                logger.log(`Smart match found! Merging incoming '${incomingTitle}' with existing '${candidate.title}'`)
                targetEventId = candidate.id
                break
            }
        }
    }

    // Prepare payload
    const formatDate = (dateStr?: string | null) => (dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ') : null)

    const eventPayload = {
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

    if (targetEventId) {
        await mysql.updateTable(EventTable._table).set(eventPayload).where('id', '=', targetEventId).execute()

        await syncEventCategories(targetEventId, event.categories ?? [])
        logger.log(`Updated existing event Id: ${targetEventId}`)
    } else {
        await mysql
            .insertInto(EventTable._table)
            .values({
                id: incomingId,
                ...eventPayload
            })
            .execute()

        await syncEventCategories(incomingId, event.categories ?? [])
        logger.log(`Inserted new event Id: ${incomingId}`)
    }
}

/**
 * Reconciles the Many-to-Many relationships between an event and its categories.
 * * @param eventId - The ID of the event to sync.
 * @param eventId - The ID of the event to sync.
 * @param incomingCategoryIds - The list of category IDs to associate.
 */
async function syncEventCategories(eventId: string, incomingCategoryIds: string[]): Promise<void> {
    if (incomingCategoryIds.length === 0) {
        await mysql.deleteFrom(EventCategoryTable._table).where('event_id', '=', eventId).execute()
        return
    }

    // Ensure all categories exist in the lookup table
    for (const categoryId of incomingCategoryIds) {
        await mysql.insertInto(CategoryTable._table).values({ id: categoryId }).onDuplicateKeyUpdate({ id: categoryId }).execute()
    }

    // Determine diff
    const existingRelations = await mysql.selectFrom(EventCategoryTable._table).select('category_id').where('event_id', '=', eventId).execute()

    const existingIds = new Set(existingRelations.map(r => r.category_id))
    const incomingIds = new Set(incomingCategoryIds)

    const toDeleteIds = [...existingIds].filter(id => !incomingIds.has(id))
    const toInsert = [...incomingIds].filter(id => !existingIds.has(id)).map(categoryId => ({ event_id: eventId, category_id: categoryId }))

    if (toDeleteIds.length > 0) {
        await mysql.deleteFrom(EventCategoryTable._table).where('event_id', '=', eventId).where('category_id', 'in', toDeleteIds).execute()
    }

    if (toInsert.length > 0) {
        await mysql.insertInto(EventCategoryTable._table).values(toInsert).execute()
    }
}
