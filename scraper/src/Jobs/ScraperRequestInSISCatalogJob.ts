import { scraper } from '@scraper/bullmq'
import { ScraperInSISCatalogRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequestInSISCatalogJob(data: ScraperInSISCatalogRequestJob): Promise<void> {
    const logger = new LoggerService(`[${data.type}]`)

    logger.log('Started - Fetching discovery options...')
    const baseUrl = 'https://insis.vse.cz/katalog/index.pl'
    const discoveryResponse = await Axios.get(`${baseUrl}?jak=rozsirene`, { headers: ExtractInSISService.baseRequestHeaders() })
    const options = ExtractInSISService.extractCatalogSearchOptions(discoveryResponse.data)

    if (options.faculties.length === 0 || options.periods.length === 0) {
        throw new Error('Failed to extract catalog search options (faculties or periods not found).')
    }

    logger.log(`Options Fetched - Faculties: ${options.faculties.length}, Periods: ${options.periods.length}. Starting iteration...`)

    for (const faculty of options.faculties) {
        for (const period of options.periods) {
            logger.log(`Querying -> Faculty: ${faculty.name} | Period: ${period.name}`)

            const params = new URLSearchParams()
            params.append('kredity_od', '')
            params.append('kredity_do', '')
            params.append('fakulta', faculty.id.toString())
            params.append('obdobi', period.id.toString())
            params.append('vyhledat_rozsirene', 'Vyhledat předměty')
            params.append('jak', 'rozsirene')
            params.append('lang', 'cz')

            try {
                const searchResponse = await Axios.post<string>(baseUrl, params.toString(), { headers: ExtractInSISService.baseRequestHeaders() })
                const coursesUrls = ExtractInSISService.extractCatalog(searchResponse.data)

                logger.log(`Found ${coursesUrls.length} courses for [${faculty.name} / ${period.name}]. Queuing response...`)

                await scraper.queue.response.add(`InSIS Catalog Response ${faculty.name} ${period.name}`, {
                    type: 'InSIS:Catalog',
                    catalog: { urls: coursesUrls },
                    meta: { faculty: faculty, period: period }
                })

                if (!coursesUrls || coursesUrls.length === 0 || !data.auto_queue_courses) {
                    continue
                }

                logger.log(`Bulk queuing ${coursesUrls.length} course jobs...`)
                await scraper.queue.request.addBulk(
                    coursesUrls.map(courseUrl => ({
                        name: 'InSIS Course Request (Catalog)',
                        data: {
                            type: 'InSIS:Course',
                            url: courseUrl,
                            meta: { faculty: faculty, period: period }
                        },
                        opts: {
                            deduplication: {
                                id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(courseUrl)}`
                            }
                        }
                    }))
                )
            } catch (error) {
                logger.error(`Failed to scrape catalog for Faculty: ${faculty.name}, Period: ${period.name}`, error)
            }
        }
    }
    logger.log('Finished successfully.')
}
