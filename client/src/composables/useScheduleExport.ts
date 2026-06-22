import type { Ref } from 'vue'
import { ref } from 'vue'
import { toPng } from 'html-to-image'
import analytics from '@client/analytics'

const EXPORT_WIDTH = 1200

export function useScheduleExport(gridRef: Ref<HTMLElement | null>) {
	const exporting = ref(false)

	async function exportSchedule(): Promise<void> {
		if (!gridRef.value || exporting.value) return
		exporting.value = true

		const el = gridRef.value

		const wrapper = document.createElement('div')
		wrapper.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${EXPORT_WIDTH}px;overflow:visible;`
		const clone = el.cloneNode(true) as HTMLElement
		clone.style.cssText = `width:${EXPORT_WIDTH}px;overflow:visible;`
		wrapper.appendChild(clone)
		document.body.appendChild(wrapper)

		try {
			const dataUrl = await toPng(clone, {
				pixelRatio: 2,
				width: EXPORT_WIDTH,
				height: clone.scrollHeight,
				style: { overflow: 'visible' },
				skipFonts: true
			})

			// Stamp watermark onto canvas
			const img = new Image()
			await new Promise<void>(resolve => {
				img.onload = () => resolve()
				img.src = dataUrl
			})
			const canvas = document.createElement('canvas')
			canvas.width = img.width
			canvas.height = img.height
			const ctx = canvas.getContext('2d')!
			ctx.drawImage(img, 0, 0)
			const fontSize = Math.max(20, Math.round(canvas.width * 0.018))
			ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`
			ctx.fillStyle = 'rgba(0, 102, 179, 0.35)'
			ctx.textAlign = 'right'
			ctx.textBaseline = 'bottom'
			ctx.fillText('kreditozrouti.cz', canvas.width - 20, canvas.height - 16)

			const a = document.createElement('a')
			a.href = canvas.toDataURL('image/png')
			a.download = 'rozvrh-kreditozrouti.png'
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)

			analytics.track('schedule_shared')
		} catch (err) {
			console.error('[useScheduleExport] export failed:', err)
		} finally {
			document.body.removeChild(wrapper)
			exporting.value = false
		}
	}

	return { exportSchedule, exporting }
}
