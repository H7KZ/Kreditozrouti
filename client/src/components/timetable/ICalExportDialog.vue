<script setup lang="ts">
import type { SelectedCourseUnit } from '@client/types'
import type { ICalCourseConfig } from '@client/utils/ical'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDefaultSemesterDates, useICalExport } from '@client/composables'
import { useWizardStore } from '@client/stores'
import IconCalendarDown from '~icons/lucide/calendar-arrow-down'
import IconLink from '~icons/lucide/link'
import IconCheck from '~icons/lucide/check'
import IconX from '~icons/lucide/x'

// Props & emits

interface Props {
	modelValue: boolean
	units: SelectedCourseUnit[]
}

interface Emits {
	(e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// i18n & stores

const { t, locale } = useI18n()
const wizardStore = useWizardStore()
const { exportIcal, generateWebcalLink } = useICalExport()

// Semester date range state

const defaults = computed(() => getDefaultSemesterDates(wizardStore.year, wizardStore.semester))

const semesterStart = ref(defaults.value.start)
const semesterEnd = ref(defaults.value.end)

// Per-slot row state

interface SlotRow extends ICalCourseConfig {
	label: string
}

const rows = ref<SlotRow[]>([])

function minutesToTime(m: number): string {
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function initRows() {
	semesterStart.value = defaults.value.start
	semesterEnd.value = defaults.value.end

	rows.value = props.units.map(unit => {
		const courseTitle = `${unit.courseIdent} ${locale.value === 'en' ? unit.courseTitleEn || unit.courseTitle : unit.courseTitleCs || unit.courseTitle}`
		const when = unit.day ? `${unit.day} ${minutesToTime(unit.timeFrom)}` : (unit.date ?? '')
		return {
			slotId: unit.slotId,
			label: `${unit.courseIdent} · ${unit.unitType ?? ''} · ${when}`,
			title: courseTitle,
			location: unit.location ?? '',
			description: unit.lecturer ?? ''
		}
	})
}

watch(
	() => props.modelValue,
	open => {
		if (open) initRows()
	}
)

// Actions

function close() {
	emit('update:modelValue', false)
}

function handleDownload() {
	exportIcal(props.units, rows.value, semesterStart.value, semesterEnd.value)
	close()
}

// Webcal link state
const webcalUrl = ref<string | null>(null)
const webcalLoading = ref(false)
const webcalCopied = ref(false)

async function handleCopyLink() {
	webcalLoading.value = true
	webcalUrl.value = null
	try {
		const url = await generateWebcalLink(props.units, rows.value, semesterStart.value, semesterEnd.value)
		webcalUrl.value = url
		await navigator.clipboard.writeText(url)
		webcalCopied.value = true
		setTimeout(() => {
			webcalCopied.value = false
		}, 2000)
	} finally {
		webcalLoading.value = false
	}
}
</script>

<template>
	<Teleport to="body">
		<div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" @click.self="close">
			<div class="flex w-full max-w-5xl flex-col gap-4 rounded-lg bg-(--insis-surface) p-6 shadow-xl">
				<!-- Header -->
				<div class="flex items-start justify-between gap-4">
					<h2 class="text-lg font-semibold text-(--insis-gray-900)">
						{{ t('components.timetable.ICalExportDialog.title') }}
					</h2>
					<button type="button" class="insis-btn-text shrink-0" :aria-label="t('common.close')" @click="close">
						<IconX class="h-5 w-5" />
					</button>
				</div>

				<!-- No units fallback -->
				<p v-if="units.length === 0" class="text-sm text-(--insis-gray-700)">
					{{ t('components.timetable.ICalExportDialog.noUnits') }}
				</p>

				<template v-else>
					<!-- Semester date range -->
					<fieldset class="flex flex-col gap-3">
						<legend class="mb-1 text-sm font-medium text-(--insis-gray-900)">
							{{ t('components.timetable.ICalExportDialog.semesterRange') }}
						</legend>
						<div class="flex flex-wrap gap-4">
							<label class="flex flex-col gap-1">
								<span class="text-xs text-(--insis-gray-600)">
									{{ t('components.timetable.ICalExportDialog.semesterStart') }}
								</span>
								<input
									v-model="semesterStart"
									type="date"
									class="rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1 text-sm text-(--insis-gray-900) focus:ring-2 focus:ring-(--insis-blue)/40 focus:outline-none"
								/>
							</label>
							<label class="flex flex-col gap-1">
								<span class="text-xs text-(--insis-gray-600)">
									{{ t('components.timetable.ICalExportDialog.semesterEnd') }}
								</span>
								<input
									v-model="semesterEnd"
									type="date"
									class="rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1 text-sm text-(--insis-gray-900) focus:ring-2 focus:ring-(--insis-blue)/40 focus:outline-none"
								/>
							</label>
						</div>
					</fieldset>

					<!-- Per-course customisation table -->
					<div>
						<p class="mb-2 text-sm font-medium text-(--insis-gray-900)">
							{{ t('components.timetable.ICalExportDialog.courseCustomization') }}
						</p>
						<div class="max-h-72 overflow-y-auto rounded border border-(--insis-border)">
							<table class="w-full text-sm">
								<thead class="sticky top-0 bg-(--insis-header-bg)">
									<tr>
										<th class="px-3 py-2 text-left font-medium text-(--insis-gray-700)">
											{{ t('components.timetable.ICalExportDialog.slot') }}
										</th>
										<th class="px-3 py-2 text-left font-medium text-(--insis-gray-700)">
											{{ t('components.timetable.ICalExportDialog.courseTitle') }}
										</th>
										<th class="px-3 py-2 text-left font-medium text-(--insis-gray-700)">
											{{ t('components.timetable.ICalExportDialog.courseLocation') }}
										</th>
										<th class="px-3 py-2 text-left font-medium text-(--insis-gray-700)">
											{{ t('components.timetable.ICalExportDialog.courseDescription') }}
										</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="row in rows" :key="row.slotId" class="border-t border-(--insis-border)">
										<td class="px-3 py-2 text-xs whitespace-nowrap text-(--insis-gray-600)">{{ row.label }}</td>
										<td class="px-3 py-2">
											<input
												v-model="row.title"
												type="text"
												class="w-full rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1 text-xs text-(--insis-gray-900) focus:ring-1 focus:ring-(--insis-blue)/40 focus:outline-none"
											/>
										</td>
										<td class="px-3 py-2">
											<input
												v-model="row.location"
												type="text"
												class="w-full rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1 text-xs text-(--insis-gray-900) focus:ring-1 focus:ring-(--insis-blue)/40 focus:outline-none"
											/>
										</td>
										<td class="px-3 py-2">
											<input
												v-model="row.description"
												type="text"
												class="w-full rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1 text-xs text-(--insis-gray-900) focus:ring-1 focus:ring-(--insis-blue)/40 focus:outline-none"
											/>
										</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>

					<!-- Webcal link display -->
					<div v-if="webcalUrl" class="flex items-center gap-2 rounded border border-(--insis-border) bg-(--insis-surface-secondary) px-3 py-2">
						<span class="min-w-0 flex-1 truncate font-mono text-xs text-(--insis-gray-700)">{{ webcalUrl }}</span>
						<span class="shrink-0 text-xs text-(--insis-green)">{{ t('components.timetable.ICalExportDialog.linkCopied') }}</span>
					</div>

					<!-- Footer buttons -->
					<div class="flex flex-col gap-2 sm:flex-row-reverse">
						<button type="button" class="insis-btn insis-btn-primary flex items-center justify-center gap-1.5 text-sm" @click="handleDownload">
							<IconCalendarDown class="h-4 w-4" aria-hidden="true" />
							{{ t('components.timetable.ICalExportDialog.download') }}
						</button>
						<button
							type="button"
							class="insis-btn insis-btn-secondary flex items-center justify-center gap-1.5 text-sm"
							:disabled="webcalLoading"
							@click="handleCopyLink"
						>
							<IconCheck v-if="webcalCopied" class="h-4 w-4 text-(--insis-green)" aria-hidden="true" />
							<IconLink v-else class="h-4 w-4" aria-hidden="true" />
							{{ webcalCopied ? t('components.timetable.ICalExportDialog.linkCopied') : t('components.timetable.ICalExportDialog.copyLink') }}
						</button>
						<button type="button" class="insis-btn insis-btn-secondary text-sm" @click="close">
							{{ t('components.timetable.ICalExportDialog.cancel') }}
						</button>
					</div>
				</template>
			</div>
		</div>
	</Teleport>
</template>
