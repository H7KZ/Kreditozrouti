export default class UtilService {
    /**
     * A native helper to process an array of items with limited concurrency.
     */
    static async runWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
        const results: R[] = new Array(items.length) as R[]
        const iterator = items.entries()

        const workers = Array(Math.min(items.length, concurrency))
            .fill(null)
            .map(async () => {
                for (const [index, item] of iterator) {
                    try {
                        results[index] = await task(item)
                    } catch (error) {
                        console.error(`Error processing item at index ${index}:`, error)
                    }
                }
            })

        await Promise.all(workers)
        return results
    }
}
