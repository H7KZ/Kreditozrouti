import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { scraper } from '@api/bullmq'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

createBullBoard({
	queues: [
		new BullMQAdapter(scraper.queue.request),
		new BullMQAdapter(scraper.queue.response)
	],
	serverAdapter
})

export const bullboardRouter = serverAdapter.getRouter()
