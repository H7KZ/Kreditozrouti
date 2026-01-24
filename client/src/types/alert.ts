import type { ButtonVariants } from '@client/components/ui/button'

export interface Alert {
	customId?: string
	type: 'info' | 'success' | 'warning' | 'error'
	title?: string
	description?: string
	buttons?: Array<{
		label: string
		variant?: ButtonVariants['variant']
		action: () => void
	}>
	timeout?: number
	_timeout?: NodeJS.Timeout | number | null
}
