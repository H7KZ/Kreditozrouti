export function timeToMinutes(time: string | null): number | null {
	if (!time?.includes(':')) return null
	const [hours, minutes] = time.split(':').map(Number)
	return (hours ?? 0) * 60 + (minutes ?? 0)
}

export function minutesToTime(minutes: number | null | undefined): string {
	if (minutes == null) return '--:--'
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
