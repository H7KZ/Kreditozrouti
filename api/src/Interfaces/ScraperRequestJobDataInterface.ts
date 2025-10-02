import ScraperJobType from '@/Types/ScraperJobType'

export interface ScraperRequestJobDataBase {
    type: ScraperJobType
}

export interface EventsScraperRequestJobData extends ScraperRequestJobDataBase {
    type: 'Events'
}

export interface EventScraperRequestJobData extends ScraperRequestJobDataBase {
    type: 'Event'
    eventId: string
    includeAttendees: boolean
}

export interface EventRegisterScraperRequestJobData extends ScraperRequestJobDataBase {
    type: 'EventRegister'
    eventId: string
    userId: string
}

type ScraperRequestJobDataInterface = EventsScraperRequestJobData | EventScraperRequestJobData | EventRegisterScraperRequestJobData

export default ScraperRequestJobDataInterface
