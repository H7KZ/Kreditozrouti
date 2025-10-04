import { Category, Event, PrismaClient, User } from '@prisma/client'

const mysql = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    const users: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
            email: 'diar.4fis@gmail.com'
        }
    ]

    await Promise.all(
        users.map(user =>
            mysql.user.upsert({
                where: { email: user.email },
                update: {},
                create: user
            })
        )
    )

    console.log('Seeded users.')

    const events: Omit<Event, 'createdAt' | 'updatedAt'>[] = [
        {
            id: 'test-event-1',
            title: 'First Event',
            subtitle: 'An exciting beginning',
            datetime: new Date('2024-07-01T10:00:00Z'),
            imageSrc: 'https://example.com/image1.jpg',
            imageAlt: 'Image for First Event',
            description: 'This is the description for the first event.',
            place: 'Conference Hall A',
            author: 'John Doe',
            language: 'en',
            registrationFrom: new Date('2024-06-01T00:00:00Z'),
            registrationUrl: 'https://example.com/register1',
            substituteUrl: null
        }
    ]

    await Promise.all(
        events.map(event =>
            mysql.event.upsert({
                where: { id: event.id },
                update: {},
                create: event
            })
        )
    )

    console.log('Seeded events.')

    const categories: Category[] = [
        {
            id: 'Conference'
        }
    ]

    await Promise.all(
        categories.map(category =>
            mysql.category.upsert({
                where: { id: category.id },
                update: {},
                create: category
            })
        )
    )

    console.log('Seeded categories.')

    const eventCategories = [
        {
            eventId: events[0].id,
            categoryId: categories[0].id
        }
    ]

    await Promise.all(
        eventCategories.map(ec =>
            mysql.eventsCategories.upsert({
                where: {
                    eventId_categoryId: {
                        eventId: ec.eventId,
                        categoryId: ec.categoryId
                    }
                },
                update: {},
                create: ec
            })
        )
    )

    console.log('Seeded event categories.')

    console.log('Database seeded successfully.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await mysql.$disconnect()
    })
