export interface AlertButton {
	label: string
	variant?: 'primary' | 'secondary' | 'danger'
	action: () => void
}

export interface Alert {
	customId?: string
	type: 'info' | 'success' | 'warning' | 'error'
	title?: string
	description?: string
	buttons?: AlertButton[]
	timeout?: number
	_timeout?: ReturnType<typeof setTimeout> | number | null
}
