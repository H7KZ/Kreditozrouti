/**
 * Defines the unique identifiers for the various scraping tasks supported by the system.
 * Distinguishes between list retrieval and detail scraping for different data sources.
 */
type ScraperJob =
    // 4FIS Events (in order of scraping)
    // '4FIS:Events' -> '4FIS:Event'
    // --------------------------------
    | '4FIS:Events'
    | '4FIS:Event'

    // 4FIS Flickr Events (in order of scraping)
    // '4FIS:Flickr:Events' -> '4FIS:Flickr:Event'
    // --------------------------------
    | '4FIS:Flickr:Events'
    | '4FIS:Flickr:Event'

    // InSIS Courses (in order of scraping)
    // 'InSIS:Catalog' -> 'InSIS:Courses'
    // --------------------------------
    | 'InSIS:Catalog'
    | 'InSIS:Course'

    // InSIS Study Programs (in order of scraping)
    // InSIS:StudyPlans -> InSIS:StudyPlan
    // --------------------------------
    | 'InSIS:StudyPlans'
    | 'InSIS:StudyPlan'

export default ScraperJob
