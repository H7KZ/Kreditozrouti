import scraper from '@scraper/bullmq'
import { ScraperInSISCatalogRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import LoggerService from '@scraper/Services/LoggerService'
import Axios from 'axios'

export default async function ScraperRequestInSISCatalogJob(data: ScraperInSISCatalogRequestJob): Promise<void | null> {
    const logger = new LoggerService(`[InSIS:Catalog]`)
    const baseUrl = 'https://insis.vse.cz/katalog/index.pl'

    logger.log('Started - Fetching discovery options...')

    try {
        // Phase 1: Discovery
        const discoveryResponse = await Axios.get(`${baseUrl}?jak=rozsirene`, {
            headers: ExtractInSISService.baseRequestHeaders()
        })
        const options = ExtractInSISService.extractCatalogSearchOptions(discoveryResponse.data)

        if (!options.faculties.length || !options.periods.length) {
            throw new Error('Discovery failed: No faculties or periods found.')
        }

        logger.log(`Options Found - Faculties: ${options.faculties.length}, Periods: ${options.periods.length}. Starting iterations...`)

        // Phase 2: Iteration
        for (const faculty of options.faculties) {
            for (const period of options.periods) {
                logger.log(`Processing: [Faculty: ${faculty.name}] [Period: ${period.name}]`)

                const params = new URLSearchParams({
                    kredity_od: '',
                    kredity_do: '',
                    fakulta: faculty.id.toString(),
                    obdobi: period.id.toString(),
                    vyhledat_rozsirene: 'Vyhledat předměty',
                    jak: 'rozsirene',
                    lang: 'cz'
                })

                try {
                    const searchResponse = await Axios.post<string>(baseUrl, params.toString(), {
                        headers: ExtractInSISService.baseRequestHeaders()
                    })
                    const coursesUrls = ExtractInSISService.extractCatalog(searchResponse.data)

                    logger.log(`Found ${coursesUrls.length} courses. Queuing catalog response...`)
                    await scraper.queue.response.add(`InSIS Catalog Response ${faculty.name} ${period.name}`, {
                        type: 'InSIS:Catalog',
                        catalog: { urls: coursesUrls },
                        meta: { faculty, period }
                    })

                    if (coursesUrls.length && data.auto_queue_courses) {
                        logger.log(`Auto-Queuing ${coursesUrls.length} course jobs...`)
                        await scraper.queue.request.addBulk(
                            coursesUrls.map(courseUrl => ({
                                name: 'InSIS Course Request (Catalog)',
                                data: {
                                    type: 'InSIS:Course',
                                    url: courseUrl,
                                    meta: { faculty, period }
                                },
                                opts: {
                                    deduplication: {
                                        id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(courseUrl)}`
                                    }
                                }
                            }))
                        )
                    }
                } catch (innerError) {
                    logger.error(`Failed iteration for ${faculty.name}/${period.name}`, innerError)
                    // Continue to next period
                }
            }
        }
        logger.log('Finished successfully.')
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            logger.error(`Network Error: ${error.message}`)
        } else {
            logger.error(`Critical Error: ${(error as Error).message}`)
        }

        return null
    }
}
