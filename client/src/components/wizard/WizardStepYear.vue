<script setup lang="ts">
import FacetItem from '@api/Interfaces/FacetItem.ts'
import InSISService from '@api/Services/InSISService.ts'
import { computed } from 'vue'
import IconArrowLeft from '~icons/lucide/arrow-left'

/*
 * WizardStepYear
 * Step 2: Academic year selection
 */

interface Props {
	years: FacetItem[]
	selectedYear: number | null
}

interface Emits {
	(e: 'select', year: number): void
	(e: 'back'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const sortedYears = computed(() => {
	return props.years
		.filter((year) =>
			InSISService.getPeriodsForLastYears()
				.map((p) => p.year)
				.includes(Number(year.value)),
		)
		.slice()
		.sort((a, b) => Number(b.value) - Number(a.value))
})

function formatAcademicYear(year: number): string {
	return `${year}`
}

function handleSelect(year: number) {
	emit('select', year)
}

function handleBack() {
	emit('back')
}
</script>

<template>
	<div>
		<div class="mb-4 flex items-center gap-4">
			<button type="button" class="insis-btn-text flex items-center gap-1" @click="handleBack">
				<IconArrowLeft class="h-4 w-4" />
				{{ $t('common.back') }}
			</button>
			<h2 class="text-lg font-medium text-[var(--insis-gray-900)]">{{ $t('components.wizard.WizardStepYear.title') }}</h2>
		</div>

		<p class="mb-6 text-sm text-[var(--insis-gray-600)]">{{ $t('components.wizard.WizardStepYear.description') }}</p>

		<div v-if="years.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepYear.loading') }}</p>
		</div>

		<div v-else class="grid gap-3 sm:grid-cols-3">
			<button
				v-for="year in sortedYears"
				:key="`year-${year.value}`"
				type="button"
				:class="[
					'rounded border p-4 text-center transition-all cursor-pointer',
					selectedYear === year.value
						? 'border-[var(--insis-blue)] bg-[var(--insis-blue-light)]'
						: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue-dark)] hover:bg-[var(--insis-gray-50)]',
				]"
				@click="handleSelect(Number(year.value))"
			>
				<div class="text-lg font-medium text-[var(--insis-gray-900)]">
					{{ formatAcademicYear(Number(year.value)) }}
				</div>
				<div class="mt-1 text-sm text-[var(--insis-gray-500)]">{{ year.count }} {{ $t('common.plans') }}</div>
			</button>
		</div>

		<div class="mt-6 rounded border border-[var(--insis-info)] bg-[var(--insis-info-bg)] p-3">
			<p class="text-sm text-[var(--insis-gray-700)]">
				<strong>{{ $t('common.tip') }}:</strong> {{ $t('components.wizard.WizardStepYear.tip') }}
			</p>
		</div>
	</div>
</template>
