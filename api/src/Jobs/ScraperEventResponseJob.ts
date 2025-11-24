import { mysql } from '@api/clients'
import { ScraperFISEventResponseJobInterface } from '@scraper/Interfaces/BullMQ/ScraperResponseJobInterface'
import { Job } from 'bullmq'

export default async function ScraperEventResponseJob(job: Job<ScraperFISEventResponseJobInterface>): Promise<void> {
    const data = job.data.event

    if (!data) {
        console.warn(`No event data found for job ID: ${job.id}`)
        return
    }

    const eventId = data.id

    if (!eventId) {
        console.warn(`No event ID found in event data for job ID: ${job.id}`)
        return
    }

    console.log(`Processing event response for event ID: ${eventId}`)

    const event = await mysql.selectFrom('events').select('id').where('id', '=', eventId).executeTakeFirst()

    if (!event) {
        console.log(
            mysql
                .insertInto('events')
                .values({
                    id: eventId,
                    title: data.title,
                    subtitle: data.subtitle,
                    datetime: data.datetime ? new Date(data.datetime).toISOString().slice(0, 19).replace('T', ' ') : null,
                    imageSrc: data.image.src,
                    imageAlt: data.image.alt,
                    description: data.description,
                    place: data.place,
                    author: data.author,
                    language: data.language,
                    registrationFrom: data.registrationFrom ? new Date(data.registrationFrom).toISOString().slice(0, 19).replace('T', ' ') : null,
                    registrationUrl: data.registrationUrl,
                    substituteUrl: data.substituteUrl
                })
                .compile()
        )

        await mysql
            .insertInto('events')
            .values({
                id: eventId,
                title: data.title,
                subtitle: data.subtitle,
                datetime: data.datetime ? new Date(data.datetime).toISOString().slice(0, 19).replace('T', ' ') : null,
                imageSrc: data.image.src,
                imageAlt: data.image.alt,
                description: data.description,
                place: data.place,
                author: data.author,
                language: data.language,
                registrationFrom: data.registrationFrom ? new Date(data.registrationFrom).toISOString().slice(0, 19).replace('T', ' ') : null,
                registrationUrl: data.registrationUrl,
                substituteUrl: data.substituteUrl
            })
            .execute()

        if (data.categories && data.categories.length > 0) {
            for (const categoryId of data.categories) {
                await createCategoryIfNotExists(categoryId)
                await createEventCategoryRelation(eventId, categoryId)
            }
        }

        console.log(`Created new event with ID: ${eventId}`)

        return
    }

    await mysql
        .updateTable('events')
        .set({
            title: data.title,
            subtitle: data.subtitle,
            datetime: data.datetime ? new Date(data.datetime).toISOString().slice(0, 19).replace('T', ' ') : null,
            imageSrc: data.image.src,
            imageAlt: data.image.alt,
            description: data.description,
            place: data.place,
            author: data.author,
            language: data.language,
            registrationFrom: data.registrationFrom ? new Date(data.registrationFrom).toISOString().slice(0, 19).replace('T', ' ') : null,
            registrationUrl: data.registrationUrl,
            substituteUrl: data.substituteUrl
        })
        .where('id', '=', eventId)
        .execute()

    if (data.categories && data.categories.length > 0) {
        for (const categoryId of data.categories) {
            await createCategoryIfNotExists(categoryId)
            await createEventCategoryRelation(eventId, categoryId)
        }
    }

    console.log(`Updated existing event with ID: ${eventId}`)
}

async function createCategoryIfNotExists(categoryId: string): Promise<void> {
    const category = await mysql.selectFrom('categories').selectAll().where('id', '=', categoryId).executeTakeFirst()

    if (!category) {
        await mysql
            .insertInto('categories')
            .values({
                id: categoryId
            })
            .execute()

        console.log(`Created new category with ID: ${categoryId}`)
    }
}

async function createEventCategoryRelation(eventId: string, categoryId: string): Promise<void> {
    const relation = await mysql
        .selectFrom('events_categories')
        .selectAll()
        .where('event_id', '=', eventId)
        .where('category_id', '=', categoryId)
        .executeTakeFirst()

    if (!relation) {
        await mysql
            .insertInto('events_categories')
            .values({
                event_id: eventId,
                category_id: categoryId
            })
            .execute()

        console.log(`Created new event-category relation: Event ID ${eventId}, Category ID ${categoryId}`)
    }
}
