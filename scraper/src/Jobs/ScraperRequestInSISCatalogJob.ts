import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { ScraperInSISCatalogRequestJob } from '@scraper/Interfaces/ScraperRequestJob'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { InSISQueueService } from '@scraper/Services/InSISQueueService'

interface Faculty {
    id: number
    name: string
}

interface Period {
    id: number
    name: string
}

/**
 * Scrapes the InSIS course catalog.
 *
 * Phase 1: Discovers available faculties and academic periods
 * Phase 2: Iterates through each combination, extracting course URLs
 */
export default async function ScraperRequestInSISCatalogJob(data: ScraperInSISCatalogRequestJob): Promise<void | null> {
    const client = createInSISClient('catalog')

    // Phase 1: Discovery
    const options = await discoverSearchOptions(client)
    if (!options) return null

    LoggerJobContext.add({
        faculties_count: options.faculties.length,
        periods_count: options.periods.length
    })

    // Phase 2: Scrape each faculty/period combination
    for (const faculty of options.faculties) {
        for (const period of options.periods) {
            await scrapeCatalogPage(client, faculty, period, data.auto_queue_courses ?? false)
        }
    }
}

async function discoverSearchOptions(client: ReturnType<typeof createInSISClient>) {
    const result = await client.get(Config.insis.catalogExtendedSearchUrl)

    if (!result.success) return null

    const options = ExtractInSISCatalogService.extractSearchOptions(result.data)

    if (!options.faculties.length || !options.periods.length) {
        LoggerJobContext.add({ error: 'Discovery failed: No faculties or periods found.' })
        return null
    }

    return options
}

async function scrapeCatalogPage(client: ReturnType<typeof createInSISClient>, faculty: Faculty, period: Period, autoQueueCourses: boolean): Promise<void> {
    const params = new URLSearchParams({
        kredity_od: '',
        kredity_do: '',
        fakulta: faculty.id.toString(),
        obdobi: period.id.toString(),
        vyhledat_rozsirene: 'Vyhledat předměty',
        jak: 'rozsirene',
        lang: 'cz'
    })

    const result = await client.post<string>(Config.insis.catalogUrl, params.toString())

    if (!result.success) {
        LoggerJobContext.add({
            error: 'Catalog page fetch failed',
            faculty: faculty.name,
            period: period.name
        })
        return
    }

    const courseUrls = ExtractInSISCatalogService.extractCourseUrls(result.data)

    await InSISQueueService.addCatalogResponse(faculty, period, courseUrls)

    if (courseUrls.length && autoQueueCourses) {
        const coursesWithIds = courseUrls.map(url => ({
            url,
            courseId: ExtractInSISCourseService.extractIdFromUrl(url)
        }))

        await InSISQueueService.queueCourseRequests(coursesWithIds, { faculty, period })
    }
}
