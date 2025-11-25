import ScraperJobType from '@scraper/Types/ScraperJobType'

interface ScraperRequestJobBase {
    type: ScraperJobType
    error?: {
        message: string
        stack?: string
    }
}

export interface ScraperFISEventsRequestJobInterface extends ScraperRequestJobBase {
    type: '4FIS:Events'
}

export interface ScraperFISEventRequestJobInterface extends ScraperRequestJobBase {
    type: '4FIS:Event'
    eventId: string
}

export interface ScraperInSISCatalogRequestJobInterface extends ScraperRequestJobBase {
    type: 'InSIS:Catalog'
}

export interface ScraperInSISCourseRequestJobInterface extends ScraperRequestJobBase {
    type: 'InSIS:Course'
    url: string
}

type ScraperRequestJobInterface =
    | ScraperFISEventsRequestJobInterface
    | ScraperFISEventRequestJobInterface
    | ScraperInSISCatalogRequestJobInterface
    | ScraperInSISCourseRequestJobInterface

export default ScraperRequestJobInterface
