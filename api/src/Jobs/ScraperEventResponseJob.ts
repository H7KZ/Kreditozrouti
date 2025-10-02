import { mysql } from '$api/clients'
import { ScraperEventResponseJobInterface } from '$api/Interfaces/ScraperResponseJobInterface'
import { Job } from 'bullmq'

export default async function ScraperEventResponseJob(job: Job<ScraperEventResponseJobInterface>): Promise<void> {
    const data = job.data.event

    if (!data) {
        console.warn(`No event data found for job ID: ${job.id}`)
        return
    }

    const eventId = data.eventId

    if (!eventId) {
        console.warn(`No event ID found in event data for job ID: ${job.id}`)
        return
    }

    console.log(`Processing event response for event ID: ${eventId}`)

    const event = await mysql.event.findUnique({
        where: {
            id: eventId
        },
        include: {
            categories: true
        }
    })

    if (!event) {
        await mysql.event.create({
            data: {
                id: eventId,
                title: data.title,
                subtitle: data.subtitle,
                datetime: data.datetime,
                imageSrc: data.image.src,
                imageAlt: data.image.alt,
                description: data.description,
                place: data.place,
                author: data.author,
                language: data.language,
                registrationFrom: data.registrationFrom,
                registrationUrl: data.registrationUrl,
                substituteUrl: data.substituteUrl,

                categories: {
                    connectOrCreate: data.categories
                        ? data.categories.map(category => ({
                              where: { name: category, id: undefined },
                              create: { name: category }
                          }))
                        : []
                }
            }
        })

        console.log(`Created new event with ID: ${eventId}`)

        return
    }

    await mysql.event.update({
        where: {
            id: eventId
        },
        data: {
            title: data.title,
            subtitle: data.subtitle,
            datetime: data.datetime,
            imageSrc: data.image.src,
            imageAlt: data.image.alt,
            description: data.description,
            place: data.place,
            author: data.author,
            language: data.language,
            registrationFrom: data.registrationFrom,
            registrationUrl: data.registrationUrl,
            substituteUrl: data.substituteUrl,
            categories: {
                connectOrCreate: data.categories
                    ? data.categories.map(category => ({
                          where: { name: category, id: undefined },
                          create: { name: category }
                      }))
                    : []
            }
        }
    })

    console.log(`Updated existing event with ID: ${eventId}`)
}
