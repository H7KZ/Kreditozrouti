import { PrismaClient } from '@prisma/client'

const mysql = new PrismaClient()

async function main() {
    console.log('Seeding database...')

    // Example seed data
    const users = [
        {
            email: 'admin@diar.4fis.cz'
        }
    ]

    for (const user of users) {
        await mysql.user.create({ data: user })
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await mysql.$disconnect()
    })
