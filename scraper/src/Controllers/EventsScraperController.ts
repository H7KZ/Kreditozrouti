import { EventsScraperRequestJobData } from '@api/Interfaces/ScraperRequestJobDataInterface'

export default async function EventsScraperController(data: EventsScraperRequestJobData): Promise<void> {
    console.log('EventsScraperController called with data:', data)

    // TODO: Implement the controller logic

    // const result = await axios.get<FISGetEventsInterface>('https://4fis.cz/wp-admin/admin-ajax.php?action=example_ajax_request&paged=1&nonce=f6e3b07fed&category_name=', {
    //     headers: {
    //         'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    //     }
    // })

    return Promise.resolve()
}
