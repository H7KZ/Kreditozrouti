export async function runWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = new Array(items.length) as R[]
	const iterator = items.entries()

	const workers = Array(Math.min(items.length, concurrency))
		.fill(null)
		.map(async () => {
			for (const [index, item] of iterator) {
				results[index] = await task(item)
			}
		})

	await Promise.all(workers)
	return results
}
