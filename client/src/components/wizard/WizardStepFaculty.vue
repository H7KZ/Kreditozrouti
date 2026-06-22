<script setup lang="ts">
import type { FacetItem } from '@shared/http/facets'
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
		<h2 class="mb-4 text-lg font-medium text-(--insis-gray-900)">{{ $t('components.wizard.WizardStepFaculty.title') }}</h2>

		<p class="mb-6 text-sm text-(--insis-gray-600)">{{ $t('components.wizard.WizardStepFaculty.description') }}</p>

		<div v-if="faculties.length === 0" class="insis-panel insis-panel-info">
			<p>{{ $t('components.wizard.WizardStepFaculty.loading') }}</p>
		</div>

		<div v-else class="grid gap-3 sm:grid-cols-2">
			<button
				v-for="faculty in faculties"
				:key="`faculty-${faculty.value}`"
				type="button"
				:class="[
					'cursor-pointer rounded border p-4 text-left transition-all duration-150 active:scale-[0.99]',
					selectedFaculty === faculty.value
						? 'border-(--insis-blue) bg-(--insis-blue-light) shadow-(--insis-shadow-sm)'
						: 'border-(--insis-border) bg-(--insis-surface) hover:border-(--insis-blue-dark) hover:bg-(--insis-gray-50) hover:shadow-(--insis-shadow-sm)'
				]"
				@click="handleSelect(faculty.value as string)"
			>
				<div class="flex items-center justify-between gap-4">
					<div>
						<div class="font-medium text-(--insis-gray-900)">
							{{ faculty.value }}
						</div>
						<div class="mt-1 text-sm text-(--insis-gray-600)">
							{{ getFacultyLabel(faculty.value as string) }}
						</div>
					</div>
					<div class="shrink-0 text-sm text-(--insis-gray-500)">{{ faculty.count }} {{ $t('common.plans') }}</div>
				</div>
			</button>
		</div>
	</div>
</template>
