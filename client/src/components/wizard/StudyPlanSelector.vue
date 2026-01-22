<script setup lang="ts">
import { StudyPlanWithRelations } from '@api/Database/types'
import { useSelectionStore } from '@client/stores/selection.ts'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps<{
	loading: boolean
}>()

const { t } = useI18n()
const selectionStore = useSelectionStore()

const searchQuery = ref('')

const filteredPlans = computed(() => {
	if (!searchQuery.value) return selectionStore.studyPlans

	const query = searchQuery.value.toLowerCase()
	return selectionStore.studyPlans.filter((plan) => plan.title?.toLowerCase().includes(query) || plan.ident?.toLowerCase().includes(query))
})

function selectPlan(plan: StudyPlanWithRelations) {
	selectionStore.selectStudyPlan(plan)
}

function getLevelBadge(level: string): string {
	if (level.includes('bakalář') || level.includes('Bc')) return 'Bc.'
	if (level.includes('magist') || level.includes('Ing') || level.includes('Mgr')) return 'Ing./Mgr.'
	if (level.includes('doktor') || level.includes('PhD')) return 'Ph.D.'
	return level.substring(0, 3)
}
</script>

<template>
	<div class="plan-selector">
		<div class="insis-card">
			<div class="insis-card-header">
				{{ t('wizard.studyPlan.title') }}
			</div>
			<div class="plan-content">
				<!-- Selection summary -->
				<div class="selection-summary">
					<span>{{ selectionStore.faculty?.id }}</span>
					<span class="separator">•</span>
					<span>{{ selectionStore.semester }} {{ selectionStore.year }}/{{ (selectionStore.year || 0) + 1 }}</span>
					<button class="change-btn" @click="selectionStore.resetToStep(2)">
						{{ t('common.change') }}
					</button>
				</div>

				<!-- Search -->
				<div class="plan-search">
					<input v-model="searchQuery" type="text" class="insis-input" :placeholder="t('wizard.studyPlan.search')" />
				</div>

				<!-- Loading state -->
				<div v-if="loading" class="insis-loading">
					<div class="insis-spinner"></div>
					<span>{{ t('common.loading') }}</span>
				</div>

				<!-- Empty state -->
				<div v-else-if="filteredPlans.length === 0" class="plan-empty">
					<p v-if="searchQuery">{{ t('wizard.studyPlan.noResults') }}</p>
					<p v-else>{{ t('wizard.studyPlan.noPlans') }}</p>
				</div>

				<!-- Study plans list -->
				<div v-else class="plan-list">
					<button
						v-for="plan in filteredPlans"
						:key="plan.id"
						class="plan-item"
						:class="{ selected: selectionStore.studyPlan?.id === plan.id }"
						@click="selectPlan(plan)"
					>
						<div class="plan-level-badge">{{ getLevelBadge(plan.level ?? '') }}</div>
						<div class="plan-info">
							<div class="plan-ident">{{ plan.ident }}</div>
							<div class="plan-title">{{ plan.title }}</div>
							<div class="plan-meta">
								<span>{{ plan.mode_of_study }}</span>
								<span class="separator">•</span>
								<span>{{ plan.study_length }}</span>
							</div>
						</div>
						<div class="plan-check" v-if="selectionStore.studyPlan?.id === plan.id">✓</div>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.plan-selector {
	padding: 16px;
}

.plan-content {
	padding: 20px;
}

.selection-summary {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 16px;
	background: var(--color-insis-table-row-even);
	border-radius: 4px;
	margin-bottom: 16px;
	font-size: 14px;
}

.selection-summary .separator {
	color: #999;
}

.selection-summary .change-btn {
	margin-left: auto;
	background: transparent;
	border: 1px solid #ccc;
	color: var(--color-insis-link);
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
}

.plan-search {
	margin-bottom: 16px;
}

.plan-search .insis-input {
	width: 100%;
}

.plan-empty {
	text-align: center;
	padding: 40px 20px;
	color: #666;
}

.plan-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-height: 400px;
	overflow-y: auto;
}

.plan-item {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 16px;
	background: white;
	border: 1px solid #ddd;
	border-radius: 6px;
	cursor: pointer;
	text-align: left;
	transition: all 0.15s;
}

.plan-item:hover {
	border-color: var(--color-insis-primary);
	background: var(--color-insis-table-row-even);
}

.plan-item.selected {
	border-color: var(--color-insis-primary);
	background: linear-gradient(to right, var(--color-insis-table-header), white);
}

.plan-level-badge {
	flex-shrink: 0;
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-insis-primary);
	color: white;
	border-radius: 6px;
	font-weight: bold;
	font-size: 12px;
}

.plan-info {
	flex: 1;
	min-width: 0;
}

.plan-ident {
	font-size: 12px;
	color: #666;
	margin-bottom: 2px;
}

.plan-title {
	font-size: 14px;
	font-weight: 500;
	color: #333;
	margin-bottom: 4px;
}

.plan-meta {
	font-size: 12px;
	color: #888;
}

.plan-meta .separator {
	margin: 0 4px;
}

.plan-check {
	flex-shrink: 0;
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-insis-success);
	color: white;
	border-radius: 50%;
	font-weight: bold;
}
</style>
