<script setup lang="ts">
import { StudyPlan } from '@api/Database/types'
import { useI18n } from 'vue-i18n'

interface Props {
	plans: StudyPlan[]
	loading?: boolean
	selectedId?: number | null
}

withDefaults(defineProps<Props>(), {
	loading: false,
	selectedId: null,
})

const emit = defineEmits<{
	select: [plan: StudyPlan]
}>()

const { t } = useI18n()
</script>

<template>
	<div class="study-plan-table">
		<!-- Loading -->
		<div v-if="loading" class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4a7eb8]"></div>
			<span class="ml-3 text-[#6b7280]">{{ t('app.loading') }}</span>
		</div>

		<!-- Empty -->
		<div v-else-if="plans.length === 0" class="text-center py-12 text-[#6b7280]">
			<svg class="w-12 h-12 mx-auto mb-4 text-[#d1d5db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			{{ t('wizard.studyPlan.noPlans') }}
		</div>

		<!-- Table -->
		<div v-else class="overflow-x-auto border border-[#d1d5db] rounded-lg">
			<table class="w-full">
				<thead>
					<tr class="bg-[#e8eef5]">
						<th class="px-3 py-2 text-left text-xs font-semibold text-[#374151] uppercase border-b border-[#c0cfe0]">
							{{ t('wizard.studyPlan.level') }}
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-[#374151] uppercase border-b border-[#c0cfe0]">
							{{ t('wizard.studyPlan.columns.code') }}
						</th>
						<th class="px-3 py-2 text-left text-xs font-semibold text-[#374151] uppercase border-b border-[#c0cfe0]">
							{{ t('wizard.studyPlan.program') }}
						</th>
						<th class="px-3 py-2 text-right border-b border-[#c0cfe0] w-28"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-[#e5e7eb]">
					<tr
						v-for="plan in plans"
						:key="plan.id"
						class="transition-colors"
						:class="selectedId === plan.id ? 'bg-[#f0f7ff]' : 'bg-white hover:bg-[#f9fafb]'"
					>
						<td class="px-3 py-2.5 text-sm whitespace-nowrap">
							<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
								{{ plan.level }}
							</span>
						</td>
						<td class="px-3 py-2.5 text-sm">
							<span class="insis-course-code">{{ plan.ident }}</span>
						</td>
						<td class="px-3 py-2.5 text-sm text-[#1f2937]">
							{{ plan.title }}
						</td>
						<td class="px-3 py-2.5 text-right">
							<button
								type="button"
								class="cursor-pointer px-3 py-1.5 text-sm font-medium rounded border transition-all"
								:class="
									selectedId === plan.id
										? 'bg-[#4a7eb8] border-[#4a7eb8] text-white'
										: 'bg-white border-[#7b9ebd] text-[#4a7eb8] hover:bg-[#f0f7ff]'
								"
								@click="emit('select', plan)"
							>
								{{ selectedId === plan.id ? t('wizard.selected') : t('wizard.select') }}
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>
