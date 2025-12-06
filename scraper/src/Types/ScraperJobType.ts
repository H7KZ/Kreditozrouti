/**
 * Defines the unique identifiers for the various scraping tasks supported by the system.
 * Distinguishes between list retrieval and detail scraping for different data sources.
 */
type ScraperJobType = '4FIS:Events' | '4FIS:Event' | 'InSIS:Catalog' | 'InSIS:Course'

export default ScraperJobType
