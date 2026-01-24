<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
	year: number
	count?: number
	selected?: boolean
	isCurrent?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	count: 0,
	selected: false,
	isCurrent: false,
})

const emit = defineEmits<{
	select: [year: number]
}>()

const { t } = useI18n()

// Format academic year range (e.g., 2024/2025)
const academicYearRange = `${props.year}/${props.year + 1}`
</script>

<template>
	<div
		class="year-card group cursor-pointer rounded-lg border-2 p-4 transition-all duration-150 relative"
		:class="{
			'border-[#4a7eb8] bg-[#f0f7ff] ring-2 ring-[#4a7eb8]/20': selected,
			'border-[#d1d5db] bg-white hover:border-[#7b9ebd] hover:bg-[#f9fafb]': !selected,
		}"
		@click="emit('select', year)"
	>
		<!-- Current Year Badge -->
		<div v-if="isCurrent" class="absolute -top-2 -right-2 bg-[#10b981] text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
			{{ t('wizard.year.currentYear') }}
		</div>

		<div class="flex flex-col items-center gap-2">
			<!-- Academic Year Display -->
			<div class="text-lg font-bold text-[#1f2937]" :class="{ 'text-[#1e4a7a]': selected }">
				{{ academicYearRange }}
			</div>

			<!-- Course Count -->
			<div v-if="count > 0" class="text-sm text-[#6b7280]">
				{{ t('wizard.year.coursesAvailable', { count }) }}
			</div>

			<!-- Selection Indicator -->
			<div v-if="selected" class="mt-1">
				<div class="w-6 h-6 rounded-full bg-[#4a7eb8] flex items-center justify-center">
					<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			</div>
			<div v-else class="mt-1">
				<div class="w-6 h-6 rounded-full border-2 border-[#d1d5db] group-hover:border-[#7b9ebd]" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.year-card:focus {
	outline: none;
	ring: 2px;
	ring-color: #4a7eb8;
}
</style>
