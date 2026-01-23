export function toArray<T>(val: T | T[] | undefined): T[] {
	return val === undefined ? [] : Array.isArray(val) ? val : [val]
}
