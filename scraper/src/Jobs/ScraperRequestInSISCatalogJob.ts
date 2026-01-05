import scraper from '@scraper/bullmq'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { ScraperInSISCatalogRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import Axios from 'axios'

export default async function ScraperRequestInSISCatalogJob(data: ScraperInSISCatalogRequestJob): Promise<void | null> {
    const baseUrl = 'https://insis.vse.cz/katalog/index.pl'

    try {
        // Phase 1: Discovery
        const discoveryResponse = await Axios.get(`${baseUrl}?jak=rozsirene`, {
            headers: ExtractInSISService.baseRequestHeaders()
        })
        const options = ExtractInSISService.extractCatalogSearchOptions(discoveryResponse.data)

        if (!options.faculties.length || !options.periods.length) {
            throw new Error('Discovery failed: No faculties or periods found.')
        }

        LoggerJobContext.add({
            faculties_count: options.faculties.length,
            periods_count: options.periods.length
        })

        // Phase 2: Iteration
        for (const faculty of options.faculties) {
            for (const period of options.periods) {
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

                    await scraper.queue.response.add(`InSIS Catalog Response ${faculty.name} ${period.name}`, {
                        type: 'InSIS:Catalog',
                        catalog: { urls: coursesUrls },
                        meta: { faculty, period }
                    })

                    if (coursesUrls.length && data.auto_queue_courses) {
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
                    LoggerJobContext.add({
                        error: (innerError as Error).message,
                        faculty: faculty.name,
                        period: period.name
                    })

                    // Continue to next period
                }
            }
        }
    } catch (error) {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                error: error.message,
                catalog_status: error.response?.status,
                data: error.response?.data
            })
        } else {
            LoggerJobContext.add({
                error: (error as Error).message
            })
        }

        return null
    }
}
