import FISEventInterface from '@scraper/Interfaces/FIS/FISEventInterface'
import FISEventsInterface from '@scraper/Interfaces/FIS/FISEventsInterface'
import InSISCatalogInterface from '@scraper/Interfaces/InSIS/InSISCatalogInterface'
import InSISCourseInterface from '@scraper/Interfaces/InSIS/InSISCourseInterface'
import ScraperJobType from '@scraper/Types/ScraperJobType'

interface ScraperResponseJobBase {
    type: ScraperJobType
    error?: {
        message: string
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
    catalog: InSISCatalogInterface
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
