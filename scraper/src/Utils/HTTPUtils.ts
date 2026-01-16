import Config from '@scraper/Config/Config'

/**
 * Generates base HTTP headers for requests to InSIS.
 * Mimics a modern Chrome browser to avoid detection.
 */
export function createRequestHeaders(referer = Config.insis.defaultReferrer): Record<string, string> {
    return {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: referer,
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    }
}

/**
 * Appends Czech language parameter to URL.
 */
export function withCzechLang(url: string): string {
    const separator = url.includes('?') ? ';' : '?'
    return `${url}${separator}lang=cz`
}
