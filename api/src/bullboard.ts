import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { scraper } from '@api/bullmq'
import Config from '@api/Config/Config'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/bullboard')

createBullBoard({
	queues: [
		new BullMQAdapter(scraper.queue.request, {
			displayName: 'Scraper Requests',
			description: 'Outbound scrape jobs — InSIS catalog, study plans, and individual courses.'
		}),
		new BullMQAdapter(scraper.queue.response, {
			displayName: 'Scraper Responses',
			description: 'Inbound course data from the scraper worker. High-volume, auto-created — read only.',
			readOnlyMode: true
		})
	],
	serverAdapter,
	options: {
		uiConfig: {
			boardTitle: 'Kreditožrouti Scraper',
			environment: {
				label: Config.env.toUpperCase(),
				color: Config.isEnvProduction() ? '#c0392b' : Config.isEnvDevelopment() ? '#e67e22' : '#27ae60',
				textColor: '#ffffff'
			},
			pollingInterval: { showSetting: true }
		}
	}
})

export const bullboardRouter = serverAdapter.getRouter()
