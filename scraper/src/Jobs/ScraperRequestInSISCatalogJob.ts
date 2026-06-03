import type { ScraperInSISCatalogRequestJob } from '@scraper/types/jobs'
import { redis } from '@scraper/clients'
import Config from '@scraper/Config/Config'
import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import ExtractInSISCatalogService from '@scraper/Services/ExtractInSISCatalogService'
import ExtractInSISCourseService from '@scraper/Services/ExtractInSISCourseService'
import { createInSISClient } from '@scraper/Services/InSISHTTPClientService'
import { QueueService } from '@scraper/Services/QueueService'

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
    if (!options) {
        redis.incr('metrics:scraper:silent_failures:catalog').catch(() => {
            /* empty */
        })
        redis.expire('metrics:scraper:silent_failures:catalog', 604800).catch(() => {
            /* empty */
        })
        return null
    }

    let faculties = options.faculties
    if (data.faculties && data.faculties.length > 0) {
        faculties = faculties.filter(faculty => data.faculties!.map(f => f.toLowerCase()).includes(faculty.name.toLowerCase()))
    }

    let periods = options.periods
    if (data.periods && data.periods.length > 0) {
        periods = periods.filter(op =>
            data.periods!.some(dp => dp.semester === op.semester && dp.year === op.year && faculties.some(f => f.identifier === op.identifier?.split('_')[0]))
        )
    }

    LoggerJobContext.add({
        faculties_count: faculties.length,
        periods_count: periods.length
    })

    const allowedIdents = data.allowed_idents && data.allowed_idents.length > 0 ? new Set(data.allowed_idents) : null

    // Phase 2: Scrape each faculty/period combination
    for (const faculty of faculties) {
        for (const period of periods) {
            await scrapeCatalogPage(client, faculty.id, period.yearId, period.id, data.auto_queue_courses ?? false, allowedIdents)
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

async function scrapeCatalogPage(
    client: ReturnType<typeof createInSISClient>,
    facultyId: number,
    periodId: number,
    facultyPeriodId: number,
    autoQueueCourses: boolean,
    allowedIdents: Set<string> | null
): Promise<void> {
    const params = new URLSearchParams({
        kredity_od: '',
        kredity_do: '',
        fakulta: facultyId.toString(),
        obdobi: periodId.toString(),
        obdobi_fak: facultyPeriodId.toString(),
        vyhledat_rozsirene: 'Vyhledat předměty',
        jak: 'rozsirene',
        lang: 'cz'
    })

    const result = await client.post<string>(Config.insis.catalogUrl, params.toString())

    if (!result.success) {
        LoggerJobContext.add({
            error: 'Catalog page fetch failed'
        })
        redis.incr('metrics:scraper:silent_failures:catalog').catch(() => {
            /* empty */
        })
        redis.expire('metrics:scraper:silent_failures:catalog', 604800).catch(() => {
            /* empty */
        })
        return
    }

    let courses = ExtractInSISCatalogService.extractCourses(result.data)

    if (allowedIdents !== null) {
        courses = courses.filter(c => allowedIdents.has(c.ident))
    }

    await QueueService.addCatalogResponse(courses.map(c => c.url))

    if (courses.length && autoQueueCourses) {
        const coursesWithIds = courses.map(c => ({
            url: c.url,
            courseId: ExtractInSISCourseService.extractIdFromUrl(c.url)
        }))

        await QueueService.queueCourseRequests(coursesWithIds)
    }
}
