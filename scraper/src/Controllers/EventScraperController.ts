import { EventScraperRequestJobData } from '@api/Interfaces/ScraperRequestJobDataInterface'

export default async function EventScraperController(data: EventScraperRequestJobData): Promise<void> {
    console.log('EventScraperController called with data:', data)

    // TODO: Implement the controller logic

    // const result2 = await axios.get('https://4fis.cz/nevzdelavaci-akce/4fis-turnaj-ve-stolnim-fotbalku-vol-24/', {
    //     headers: {
    //         'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    //     }
    // })

    return Promise.resolve()
}
