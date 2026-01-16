/**
 * Defines the unique identifiers for the various scraping tasks supported by the system.
 * Distinguishes between list retrieval and detail scraping for different data sources.
 */
type ScraperJob = 'InSIS:Catalog' | 'InSIS:Course' | 'InSIS:StudyPlans' | 'InSIS:StudyPlan'

export default ScraperJob
