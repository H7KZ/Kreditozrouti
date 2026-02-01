<script setup lang="ts">
import type FacetItem from '@api/Interfaces/FacetItem'
import { useCourseLabels } from '@client/composables'

/*
 * WizardStepFaculty
 * Step 1: Faculty selection
 * Refactored to use composables for labels.
 */

// Composables
const { getFacultyLabel } = useCourseLabels()

interface Props {
	faculties: FacetItem[]
	selectedFaculty: string | null
}

interface Emits {
	(e: 'select', facultyId: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function handleSelect(facultyId: string) {
	emit('select', facultyId)
}
</script>

<template>
	<div>
		<h2 class="mb-4 text-lg font-medium text-[var(--insis-gray-900)]">{{ $t('components.wizard.WizardStepFaculty.title') }}</h2>

		<p class="mb-6 text-sm text-[var(--insis-gray-600)]">{{ $t('components.wizard.WizardStepFaculty.description') }}</p>

		<div v-if="faculties.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepFaculty.loading') }}</p>
		</div>

		<div v-else class="grid gap-3 sm:grid-cols-2">
			<button
				v-for="faculty in faculties"
				:key="`faculty-${faculty.value}`"
				type="button"
				:class="[
					'rounded border p-4 text-left transition-all cursor-pointer',
					selectedFaculty === faculty.value
						? 'border-[var(--insis-blue)] bg-[var(--insis-blue-light)]'
						: 'border-[var(--insis-border)] bg-white hover:border-[var(--insis-blue-dark)] hover:bg-[var(--insis-gray-50)]',
				]"
				@click="handleSelect(faculty.value as string)"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="font-medium text-[var(--insis-gray-900)]">
							{{ faculty.value }}
						</div>
						<div class="mt-1 text-sm text-[var(--insis-gray-600)]">
							{{ getFacultyLabel(faculty.value as string) }}
						</div>
					</div>
					<div class="text-sm text-[var(--insis-gray-500)]">{{ faculty.count }} {{ $t('common.plans') }}</div>
				</div>
			</button>
		</div>
	</div>
</template>
