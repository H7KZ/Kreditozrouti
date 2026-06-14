import type { Ref } from 'vue'
import { ref } from 'vue'
import html2canvas from 'html2canvas'
import analytics from '@client/analytics'

export function useScheduleExport(gridRef: Ref<HTMLElement | null>) {
	const exporting = ref(false)

	async function exportSchedule(): Promise<void> {
		if (!gridRef.value || exporting.value) return
		exporting.value = true

		try {
			const canvas = await html2canvas(gridRef.value, {
				scale: 2,
				useCORS: true,
				backgroundColor: getComputedStyle(gridRef.value).backgroundColor || '#ffffff',
				logging: false,
			})

			const ctx = canvas.getContext('2d')
			if (ctx) {
				const text = 'kreditozrouti.cz'
				const fontSize = Math.max(20, Math.round(canvas.width * 0.018))
				ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
				ctx.fillStyle = 'rgba(0, 102, 179, 0.35)'
				ctx.textAlign = 'right'
				ctx.textBaseline = 'bottom'
				ctx.fillText(text, canvas.width - 20, canvas.height - 16)
			}

			const url = canvas.toDataURL('image/png')
			const a = document.createElement('a')
			a.href = url
			a.download = 'rozvrh-kreditozrouti.png'
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)

			analytics.track('schedule_shared')
		} finally {
			exporting.value = false
		}
	}

	return { exportSchedule, exporting }
}
