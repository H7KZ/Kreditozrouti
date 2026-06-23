<script setup lang="ts">
import type { ShareableUnit } from '@shared/http/share'
import type { SelectedCourseUnit } from '@client/types'
import { onMounted, onUnmounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSeoMeta } from '@unhead/vue'
import analytics from '@client/analytics'
import api from '@client/api'
import AppHeader from '@client/components/common/AppHeader.vue'
import TimetableGrid from '@client/components/timetable/TimetableGrid.vue'
import { useAlertsStore, useScheduleSlotsStore, useTimetableStore } from '@client/stores'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const alertsStore = useAlertsStore()
const slotsStore = useScheduleSlotsStore()
const timetableStore = useTimetableStore()

useSeoMeta({ title: () => t('pages.share.loading') })

const units = ref<SelectedCourseUnit[]>([])
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

// Save user's own timetable so we can restore it on unmount
let savedUnits: SelectedCourseUnit[] = []

onMounted(async () => {
	savedUnits = [...timetableStore.selectedUnits]
	try {
		const { data } = await api.get<{ units: ShareableUnit[] }>(`/share/${id.value}`)
		units.value = data.units as unknown as SelectedCourseUnit[]
		// Swap into store without persisting — restored on unmount
		timetableStore.selectedUnits.splice(0, timetableStore.selectedUnits.length, ...units.value)
		analytics.track('share_viewed', { unit_count: data.units.length })
	} catch {
		error.value = true
	} finally {
		loading.value = false
	}
})

onUnmounted(() => {
	// Restore user's own timetable
	timetableStore.selectedUnits.splice(0, timetableStore.selectedUnits.length, ...savedUnits)
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
	slotsStore.saveCurrentAsSlot(name, units.value)
	analytics.track('share_forked')
	alertsStore.addAlert({ type: 'success', title: t('pages.share.savedAlert'), timeout: 4000 })
	router.push('/courses')
}
</script>

<template>
	<div class="flex min-h-screen flex-col">
		<AppHeader />

		<!-- Loading -->
		<div v-if="loading" class="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
			{{ $t('pages.share.loading') }}
		</div>

		<!-- Error -->
		<div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center">
			<p class="text-lg font-semibold">{{ $t('pages.share.errorTitle') }}</p>
			<p class="max-w-sm text-sm text-gray-500">{{ $t('pages.share.errorDescription') }}</p>
		</div>

		<!-- Content -->
		<div v-else class="flex flex-1 flex-col">
			<!-- Action bar -->
			<div class="flex flex-wrap items-center justify-between gap-3 border-b border-(--insis-border) bg-(--insis-surface) px-4 py-2 sm:px-6">
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

			<!-- Timetable — exact same component as courses page -->
			<div class="flex-1 overflow-auto">
				<TimetableGrid />
			</div>
		</div>
	</div>
</template>
