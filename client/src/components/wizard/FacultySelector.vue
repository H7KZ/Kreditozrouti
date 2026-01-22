<script setup lang="ts">
import { ExtendedFaculty } from '@client/constants/faculties.ts'
import { useSelectionStore } from '@client/stores/selection.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const selectionStore = useSelectionStore()

function selectFaculty(faculty: ExtendedFaculty) {
	selectionStore.selectFaculty(faculty)
}
</script>

<template>
	<div class="faculty-selector">
		<h2 class="insis-section-title">{{ t('wizard.faculty.title') }}</h2>
		<p class="insis-text-muted">{{ t('wizard.faculty.description') }}</p>

		<div class="insis-faculty-grid">
			<button
				v-for="faculty in selectionStore.faculties"
				:key="faculty.id"
				class="insis-faculty-card"
				:class="{ selected: selectionStore.faculty?.id === faculty.id }"
				@click="selectFaculty(faculty)"
			>
				<div class="faculty-badge">
					{{ faculty.id }}
				</div>
				<div class="faculty-name">{{ faculty.title }}</div>
			</button>
		</div>
	</div>
</template>

<style scoped>
.faculty-selector {
	padding: 16px;
}

.insis-section-title {
	color: var(--color-insis-primary);
	font-size: 18px;
	font-family: Georgia, serif;
	margin: 0 0 8px;
}

.insis-text-muted {
	color: #666;
	font-size: 13px;
	margin: 0 0 20px;
}

.faculty-badge {
	font-size: 20px;
	font-weight: bold;
	color: white;
	padding: 12px 16px;
	border-radius: 6px;
	margin-bottom: 10px;
	text-align: center;
	min-width: 60px;
}

.faculty-name {
	font-size: 13px;
	color: #333;
	text-align: center;
	line-height: 1.3;
}

.insis-faculty-card.selected .faculty-name {
	color: var(--color-insis-primary-dark);
	font-weight: 500;
}
</style>
