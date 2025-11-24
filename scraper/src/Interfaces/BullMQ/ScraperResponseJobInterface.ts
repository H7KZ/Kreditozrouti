import FISEventInterface from '@scraper/Interfaces/4FIS/FISEventInterface'
import FISEventsInterface from '@scraper/Interfaces/4FIS/FISEventsInterface'
import InSISCourseInterface from '@scraper/Interfaces/InSIS/InSISCourseInterface'
import ScraperJobType from '@scraper/Types/ScraperJobType'

interface ScraperResponseJobBase {
    type: ScraperJobType
    error?: {
        message: string
        stack?: string
    }
}

export interface ScraperFISEventsResponseJobInterface extends ScraperResponseJobBase {
    type: '4FIS:Events'
    events: FISEventsInterface
}

export interface ScraperFISEventResponseJobInterface extends ScraperResponseJobBase {
    type: '4FIS:Event'
    event: FISEventInterface | null
}

export interface ScraperInSISCatalogResponseJobInterface extends ScraperResponseJobBase {
    type: 'InSIS:Catalog'
}

export interface ScraperInSISCourseResponseJobInterface extends ScraperResponseJobBase {
    type: 'InSIS:Course'
    course: InSISCourseInterface | null
}

type ScraperResponseJobInterface =
    | ScraperFISEventsResponseJobInterface
    | ScraperFISEventResponseJobInterface
    | ScraperInSISCatalogResponseJobInterface
    | ScraperInSISCourseResponseJobInterface

export default ScraperResponseJobInterface
