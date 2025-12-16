/**
 * Manual InSIS Catalog Scraper Trigger Script
 *
 * This script manually adds an InSIS catalog scraping job to the BullMQ queue.
 * Use this for testing or triggering immediate scrapes without waiting for the scheduler.
 *
 * Usage:
 *   node scripts/test-insis-scraper.js
 *
 * Note: Make sure Redis is running on the correct port (46379 for docker-compose.local.yml)
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');

// Load .env file from project root
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ Loaded .env file from:', envPath);
}

// Redis connection configuration
// For docker-compose.local.yml, Redis is mapped to port 46379
const redisConfig = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 46379, // Changed default from 6379 to 46379
    password: process.env.REDIS_PASSWORD || undefined
};

async function triggerInSISCatalogScraper() {
    console.log('🔌 Connecting to Redis...');
    console.log(`   Host: ${redisConfig.host}:${redisConfig.port}`);

    const redis = new Redis(redisConfig);

    redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        process.exit(1);
    });

    try {
        // Test Redis connection
        await redis.ping();
        console.log('✅ Connected to Redis successfully\n');

        // Create the scraper request queue
        console.log('📋 Creating scraper-request queue...');
        const requestQueue = new Queue('scraper-request', { connection: redis });

        await requestQueue.waitUntilReady();
        console.log('✅ Queue is ready\n');

        // Add the InSIS catalog scraping job
        console.log('🚀 Adding InSIS Catalog scraping job to queue...');
        const job = await requestQueue.add('InSISCatalogRequestJob', {
            type: 'InSIS:Catalog'
        });

        console.log('✅ Job added successfully!');
        console.log(`   Job ID: ${job.id}`);
        console.log(`   Job Name: ${job.name}`);
        console.log(`   Job Data:`, job.data);
        console.log('\n📊 Next steps:');
        console.log('   1. Make sure the scraper service is running (cd scraper && pnpm run dev)');
        console.log('   2. Watch the scraper logs to see the job being processed');
        console.log('   3. Check the database for newly scraped courses');
        console.log('\n💡 To monitor the queue status:');
        console.log('   redis-cli');
        console.log('   > KEYS scraper-request:*');
        console.log('   > HGETALL bull:scraper-request:' + job.id);

        // Clean up
        await requestQueue.close();
        await redis.quit();
        console.log('\n👋 Done! Disconnected from Redis.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run the script
triggerInSISCatalogScraper();

