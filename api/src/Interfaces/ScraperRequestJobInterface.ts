import ScraperJobType from '@api/Types/ScraperJobType'

interface ScraperRequestJobBase {
    type: ScraperJobType
    error?: {
        message: string
        stack?: string
    }
}

export interface ScraperEventsRequestJobInterface extends ScraperRequestJobBase {
    type: 'Events'
}

export interface ScraperEventRequestJobInterface extends ScraperRequestJobBase {
    type: 'Event'
    eventId: string
}

export interface ScraperEventRegisterRequestJobInterface extends ScraperRequestJobBase {
    type: 'EventRegister'
    // TODO
}

type ScraperRequestJobInterface = ScraperEventsRequestJobInterface | ScraperEventRequestJobInterface | ScraperEventRegisterRequestJobInterface

export default ScraperRequestJobInterface
