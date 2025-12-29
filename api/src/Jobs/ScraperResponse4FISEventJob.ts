import { mysql } from '@api/clients'
import { CategoryTable, EventCategoryTable, EventTable } from '@api/Database/types'
import SimilarityService from '@api/Services/SimilarityService'
import { Scraper4FISEventResponseJob } from '@scraper/Interfaces/ScraperResponseJob'
import { sql } from 'kysely'

/**
 * Processes the scraper response for a specific FIS event.
 * Upserts the event details into the database and synchronizes associated category relationships.
 * Handles deduplication by checking for existing IDs or fuzzy matching Title + Date.
 *
 * @param data - The scraper response job data containing event details.
 */
export default async function ScraperResponse4FISEventJob(data: Scraper4FISEventResponseJob): Promise<void> {
    const event = data.event

    if (!event?.id) {
        return
    }

    const incomingId = event.id
    const incomingDate = event.datetime ? new Date(event.datetime) : null
    const incomingTitle = event.title ?? ''

    console.log(`Processing sync for event Id: ${incomingId} - ${incomingTitle}`)

    // 1. Attempt to resolve the target Event ID in the database
    // Priority: Exact ID Match > Fuzzy Match (Same Date + Similar Title)
    let targetEventId: string | null = null

    // Check for Exact ID match
    const existingById = await mysql.selectFrom(EventTable._table).select('id').where('id', '=', incomingId).executeTakeFirst()

    if (existingById) {
        targetEventId = existingById.id
    } else if (incomingDate && incomingTitle) {
        // Check for Fuzzy Match if ID didn't match
        // Get events on the same day
        const date = incomingDate.toISOString().slice(0, 10) // YYYY-MM-DD

        const candidates = await mysql
            .selectFrom(EventTable._table)
            .select(['id', 'title'])
            .where(sql`DATE(datetime)`, '=', date)
            .execute()

        // Find best match among candidates using the Service
        for (const candidate of candidates) {
            if (!candidate.title) continue

            // Use the new service (defaults to normalizing strings for better matching)
            const similarity = SimilarityService.calculateLevenshteinSimilarity(incomingTitle, candidate.title)

            // Threshold: 0.9 (90% similarity)
            if (similarity >= 0.9) {
                console.log(`Fuzzy match found! Merging '${incomingTitle}' with existing '${candidate.title}' - Score: ${similarity.toFixed(2)}`)
                targetEventId = candidate.id
                break
            }
        }
    }

    // 2. Prepare Payload
    const formatDate = (dateStr: string | null | undefined) => (dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace('T', ' ') : null)

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

    // 3. Execute DB Operation (Update or Insert)
    if (targetEventId) {
        // Update existing record (found via ID or Fuzzy match)
        await mysql.updateTable(EventTable._table).set(eventPayload).where('id', '=', targetEventId).execute()

        // Sync categories using the FOUND target ID
        await syncEventCategories(targetEventId, event.categories ?? [])
        console.log(`Updated existing event Id: ${targetEventId}`)
    } else {
        // Insert new record (using the scraper's ID)
        await mysql
            .insertInto(EventTable._table)
            .values({
                id: incomingId,
                ...eventPayload
            })
            .execute()

        await syncEventCategories(incomingId, event.categories ?? [])
        console.log(`Inserted new event Id: ${incomingId}`)
    }
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
