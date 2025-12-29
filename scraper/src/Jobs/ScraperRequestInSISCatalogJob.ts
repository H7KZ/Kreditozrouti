import { scraper } from '@scraper/bullmq'
import { ScraperInSISCatalogRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISService from '@scraper/Services/Extractors/ExtractInSISService'
import Axios from 'axios'

/**
 * Initiates the scraping process for the InSIS course catalog.
 * Performs a search request to retrieve the full list of courses, extracts their URLs,
 * and queues individual scrape jobs for each discovered course.
 *
 * @returns A promise that resolves when all course scrape jobs have been queued.
 */
export default async function ScraperRequestInSISCatalogJob(data: ScraperInSISCatalogRequestJob): Promise<void> {
    const baseUrl = 'https://insis.vse.cz/katalog/index.pl'

    const headers = {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://insis.vse.cz',
        Referer: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    }

    const discoveryResponse = await Axios.get(`${baseUrl}?jak=rozsirene`, { headers })
    const options = ExtractInSISService.extractCatalogSearchOptions(discoveryResponse.data)

    if (options.faculties.length === 0 || options.periods.length === 0) {
        throw new Error('Failed to extract catalog search options (faculties or periods not found).')
    }

    for (const faculty of options.faculties) {
        for (const period of options.periods) {
            const params = new URLSearchParams()

            params.append('kredity_od', '')
            params.append('kredity_do', '')

            params.append('fakulta', faculty.id.toString())
            params.append('obdobi', period.id.toString())

            params.append('vyhledat_rozsirene', 'Vyhledat předměty')
            params.append('jak', 'rozsirene')
            params.append('lang', 'cz')

            try {
                const searchResponse = await Axios.post<string>(baseUrl, params.toString(), { headers })

                const coursesUrls = ExtractInSISService.extractCatalog(searchResponse.data)

                await scraper.queue.response.add(`InSIS Catalog Response ${faculty.name} ${period.name}`, {
                    type: 'InSIS:Catalog',
                    catalog: {
                        urls: coursesUrls
                    },
                    meta: {
                        faculty: faculty,
                        period: period
                    }
                })

                if (!coursesUrls || coursesUrls.length === 0 || !data.auto_queue_courses) {
                    continue
                }

                await scraper.queue.request.addBulk(
                    coursesUrls.map(courseUrl => ({
                        name: 'InSIS Course Request (Catalog)',
                        data: {
                            type: 'InSIS:Course',
                            url: courseUrl,
                            meta: {
                                faculty: faculty,
                                period: period
                            }
                        },
                        opts: {
                            deduplication: {
                                id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(courseUrl)}`
                            }
                        }
                    }))
                )
            } catch (error) {
                console.error(`Failed to scrape catalog for Faculty: ${faculty.name}, Period: ${period.name}`, error)
            }
        }
    }
}
