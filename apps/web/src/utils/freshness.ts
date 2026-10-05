export const STALE_THRESHOLD_DAYS = 5

function toDate(updatedAt: Date | string | null | undefined): Date | null {
	if (!updatedAt) return null
	return typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt
}

export function isCourseStale(updatedAt: Date | string | null | undefined): boolean {
	const date = toDate(updatedAt)
	if (!date) return true
	return Date.now() - date.getTime() > STALE_THRESHOLD_DAYS * 86_400_000
}

export function formatRelativeAge(updatedAt: Date | string | null | undefined, locale: string): string {
	const date = toDate(updatedAt)
	if (!date) return '—'
	const diffMs = date.getTime() - Date.now()
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
	const diffDays = Math.round(diffMs / 86_400_000)
	if (Math.abs(diffDays) < 1) return rtf.format(Math.round(diffMs / 3_600_000), 'hour')
	if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day')
	return rtf.format(Math.round(diffDays / 7), 'week')
}
