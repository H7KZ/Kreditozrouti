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
    let formData = ''
    formData += 'kredity_od=&'
    formData += 'kredity_do=&'

    const semester2025_2026Id = 381
    const currentYear = new Date().getFullYear()

    for (let year = 2025; year <= currentYear + 2; year++) {
        const nextIds = [semester2025_2026Id + 20 * (year - 2025), semester2025_2026Id + 20 * (year - 2025) + 1]

        for (const id of nextIds) {
            formData += `obdobi=${id}&`
        }
    }

    formData += 'vyhledat_rozsirene=Vyhledat+p%C5%99edm%C4%9Bty&'
    formData += 'jak=rozsirene'
    formData += ';lang=cz'

    const request = await Axios.post<string>('https://insis.vse.cz/katalog/index.pl', formData, {
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            Origin: 'https://insis.vse.cz',
            Referer: 'https://insis.vse.cz/katalog/index.pl?jak=rozsirene',
            'Upgrade-Insecure-Requests': '1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    })

    const coursesUrls = ExtractInSISService.extractCatalog(request.data)

    const catalog = { urls: coursesUrls }

    await scraper.queue.response.add('InSIS Catalog Response', { type: 'InSIS:Catalog', catalog })

    if (!catalog.urls || catalog.urls.length === 0 || !data.auto_queue_courses) {
        return
    }

    catalog.urls.map(courseUrl =>
        scraper.queue.request.add(
            'InSIS Course Request (Catalog)',
            {
                type: 'InSIS:Course',
                url: courseUrl
            },
            {
                deduplication: {
                    id: `InSIS:Course:${ExtractInSISService.extractCourseIdFromURL(courseUrl)}`
                }
            }
        )
    )
}
