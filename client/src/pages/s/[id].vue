<script setup lang="ts">
import type { ShareableUnit } from '@shared/http/share'
import type { SelectedCourseUnit } from '@client/types'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeoMeta } from '@unhead/vue'
import analytics from '@client/analytics'
import api from '@client/api'
import { useAlertsStore, useScheduleSlotsStore, useTimetableStore } from '@client/stores'
import TimetableGridReadOnly from '@client/components/timetable/TimetableGridReadOnly.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const alertsStore = useAlertsStore()
const slotsStore = useScheduleSlotsStore()
const timetableStore = useTimetableStore()

useSeoMeta({ title: () => t('pages.share.loading') })

const units = ref<ShareableUnit[]>([])
const loading = ref(true)
const error = ref(false)
const copying = ref(false)

const id = computed(() => (route.params as { id: string }).id)
const uniqueCourseCount = computed(() => new Set(units.value.map(u => u.courseId)).size)
const totalEcts = computed(() => {
	const seen = new Set<number>()
	let total = 0
	for (const u of units.value) {
		if (u.ects && !seen.has(u.courseId)) {
			total += u.ects
			seen.add(u.courseId)
		}
	}
	return total
})

onMounted(async () => {
	try {
		const { data } = await api.get<{ units: ShareableUnit[] }>(`/share/${id.value}`)
		units.value = data.units
		analytics.track('share_viewed', { unit_count: data.units.length })
	} catch {
		error.value = true
	} finally {
		loading.value = false
	}
})

async function handleCopyLink() {
	copying.value = true
	await navigator.clipboard.writeText(window.location.href)
	copying.value = false
	alertsStore.addAlert({ type: 'success', title: t('pages.share.copied'), timeout: 3000 })
}

function handleSave() {
	if (!slotsStore.canSaveMoreSlots) {
		alertsStore.addAlert({ type: 'error', title: t('pages.share.slotsFull'), timeout: 6000 })
		return
	}
	const name = `${t('pages.share.slotName')} – ${new Date().toLocaleDateString()}`
	slotsStore.saveCurrentAsSlot(name, units.value as unknown as SelectedCourseUnit[])
	timetableStore.loadUnits(units.value as unknown as SelectedCourseUnit[])
	analytics.track('share_forked')
	alertsStore.addAlert({ type: 'success', title: t('pages.share.savedAlert'), timeout: 4000 })
	router.push('/courses')
}
</script>

<template>
	<div class="mx-auto max-w-5xl px-4 py-8">
		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-24 text-sm text-gray-500">
			{{ $t('pages.share.loading') }}
		</div>

		<!-- Error -->
		<div v-else-if="error" class="flex flex-col items-center justify-center gap-3 py-24 text-center">
			<p class="text-lg font-semibold">{{ $t('pages.share.errorTitle') }}</p>
			<p class="max-w-sm text-sm text-gray-500">{{ $t('pages.share.errorDescription') }}</p>
		</div>

		<!-- Content -->
		<div v-else class="flex flex-col gap-6">
			<!-- Header bar -->
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-3 text-sm text-gray-500">
					<span>{{ $t('pages.share.courseCount', uniqueCourseCount) }}</span>
					<span v-if="totalEcts > 0">·</span>
					<span v-if="totalEcts > 0">{{ $t('pages.share.ects', totalEcts) }}</span>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-(--insis-blue) ring-1 ring-(--insis-blue)/30 transition hover:bg-(--insis-blue)/8"
						@click="handleCopyLink"
					>
						{{ copying ? '...' : $t('pages.share.copyButton') }}
					</button>
					<button
						type="button"
						class="flex cursor-pointer items-center gap-1.5 rounded-md bg-(--insis-blue) px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
						@click="handleSave"
					>
						{{ $t('pages.share.saveButton') }}
					</button>
				</div>
			</div>

			<!-- Read-only timetable -->
			<TimetableGridReadOnly :units="units" />
		</div>
	</div>
</template>
