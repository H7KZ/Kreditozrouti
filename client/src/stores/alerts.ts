import type { Alert } from '@client/types'
import { defineStore } from 'pinia'

export const useAlertsStore = defineStore('alerts', {
	state: () => ({
		alerts: [] as Array<Alert>,
	}),

	actions: {
		addAlert(alert: Alert) {
			if (alert.timeout) {
				alert._timeout = setTimeout(() => {
					this.removeAlert(this.alerts.indexOf(alert))
				}, alert.timeout)
			}

			this.alerts.push(alert)
		},

		removeAlert(index: number) {
			if (index > -1) this.alerts.splice(index, 1)
		},

		removeLatestAlert() {
			if (this.alerts.length > 0) this.alerts.pop()
		},

		removeAlertById(customId: string) {
			const index = this.alerts.findIndex((alert) => alert.customId === customId)
			if (index > -1) {
				if (this.alerts[index]?._timeout) {
					clearTimeout(this.alerts[index]._timeout)
				}
				this.removeAlert(index)
			}
		},
	},
})
