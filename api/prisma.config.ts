import { defineConfig } from 'prisma/config'

export default defineConfig({
    schema: 'prisma/schema',
    migrations: {
        path: 'prisma/migrations',
        seed: 'ts-node prisma/seed.ts'
    }
})
