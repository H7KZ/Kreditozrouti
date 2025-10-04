import FISEventInterface from '@api/Interfaces/FISEventInterface'
import FISEventsInterface from '@api/Interfaces/FISEventsInterface'
import ScraperJobType from '@api/Types/ScraperJobType'

interface ScraperResponseJobBase {
    type: ScraperJobType
    error?: {
        message: string
        stack?: string
    }
}

export interface ScraperEventsResponseJobInterface extends ScraperResponseJobBase {
    type: 'Events'
    events: FISEventsInterface[]
}

export interface ScraperEventResponseJobInterface extends ScraperResponseJobBase {
    type: 'Event'
    event: FISEventInterface | null
}

export interface ScraperEventRegisterResponseJobInterface extends ScraperResponseJobBase {
    type: 'EventRegister'
    // TODO
}

type ScraperResponseJobInterface = ScraperEventsResponseJobInterface | ScraperEventResponseJobInterface | ScraperEventRegisterResponseJobInterface

export default ScraperResponseJobInterface
