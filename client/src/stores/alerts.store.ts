import type { Alert } from '@client/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAlertsStore = defineStore('alerts', () => {
	const alerts = ref<Alert[]>([])

	function addAlert(alert: Alert) {
		if (alert.timeout) {
			alert._timeout = setTimeout(() => {
				removeAlert(alerts.value.indexOf(alert))
			}, alert.timeout)
		}
		alerts.value.push(alert)
	}

	function removeAlert(index: number) {
		if (index > -1) alerts.value.splice(index, 1)
	}

	function removeLatestAlert() {
		if (alerts.value.length > 0) alerts.value.pop()
	}

	function removeAlertById(customId: string) {
		const index = alerts.value.findIndex((a) => a.customId === customId)
		if (index > -1) {
			const a = alerts.value[index]
			if (a?._timeout) clearTimeout(a._timeout as ReturnType<typeof setTimeout>)
			removeAlert(index)
		}
	}

	return { alerts, addAlert, removeAlert, removeLatestAlert, removeAlertById }
})
