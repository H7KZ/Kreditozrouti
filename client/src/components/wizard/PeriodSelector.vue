<script setup lang="ts">
import { useSelectionStore } from '@client/stores/selection.ts'
import InSISSemester from '@scraper/Types/InSISSemester.ts'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const selectionStore = useSelectionStore()

function selectYear(year: number) {
	selectionStore.selectYear(year)
}

function selectSemester(semester: InSISSemester) {
	selectionStore.selectSemester(semester)
}

function getSemesterLabel(semester: InSISSemester): string {
	return semester === 'ZS' ? t('semester.winter') : t('semester.summer')
}
</script>

<template>
	<div class="period-selector">
		<div class="insis-card">
			<div class="insis-card-header">
				{{ t('wizard.period.title') }}
			</div>
			<div class="period-content">
				<!-- Selected faculty reminder -->
				<div class="selected-faculty">
					<span class="label">{{ t('wizard.steps.faculty') }}:</span>
					<strong>{{ selectionStore.faculty?.title }}</strong>
					<button class="change-btn" @click="selectionStore.resetToStep(1)">
						{{ t('common.change') }}
					</button>
				</div>

				<!-- Year selection -->
				<div class="period-section">
					<h3>{{ t('wizard.period.year') }}</h3>
					<div class="period-options">
						<button
							v-for="year in selectionStore.availableYears"
							:key="year"
							class="period-option"
							:class="{ selected: selectionStore.year === year }"
							@click="selectYear(year)"
						>
							{{ year }}/{{ year + 1 }}
						</button>
					</div>
				</div>

				<!-- Semester selection -->
				<div class="period-section">
					<h3>{{ t('wizard.period.semester') }}</h3>
					<div class="period-options">
						<button
							v-for="semester in selectionStore.availableSemesters"
							:key="semester"
							class="period-option semester-option"
							:class="{
								selected: selectionStore.semester === semester,
								winter: semester === 'ZS',
								summer: semester === 'LS',
							}"
							@click="selectSemester(semester)"
						>
							<span class="semester-abbr">{{ semester }}</span>
							<span class="semester-full">{{ getSemesterLabel(semester) }}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.period-selector {
	padding: 16px;
}

.period-content {
	padding: 20px;
}

.selected-faculty {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 16px;
	background: var(--color-insis-table-row-even);
	border-radius: 4px;
	margin-bottom: 24px;
}

.selected-faculty .label {
	color: #666;
}

.selected-faculty strong {
	color: var(--color-insis-primary-dark);
	flex: 1;
}

.change-btn {
	background: transparent;
	border: 1px solid #ccc;
	color: var(--color-insis-link);
	padding: 4px 10px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 12px;
}

.change-btn:hover {
	background: white;
	border-color: var(--color-insis-link);
}

.period-section {
	margin-bottom: 24px;
}

.period-section:last-child {
	margin-bottom: 0;
}

.period-section h3 {
	font-size: 14px;
	font-weight: 500;
	color: #333;
	margin: 0 0 12px;
}

.period-options {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
}

.period-option {
	background: white;
	border: 2px solid #ddd;
	padding: 12px 24px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 15px;
	transition: all 0.15s;
}

.period-option:hover {
	border-color: var(--color-insis-primary);
	background: var(--color-insis-table-row-even);
}

.period-option.selected {
	border-color: var(--color-insis-primary);
	background: var(--color-insis-primary);
	color: white;
}

.semester-option {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 120px;
}

.semester-abbr {
	font-weight: bold;
	font-size: 18px;
}

.semester-full {
	font-size: 12px;
	opacity: 0.8;
	margin-top: 4px;
}

.semester-option.winter {
	border-left: 4px solid #64b5f6;
}

.semester-option.summer {
	border-left: 4px solid #ffb74d;
}

.semester-option.selected.winter {
	background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
	border-color: #1565c0;
}

.semester-option.selected.summer {
	background: linear-gradient(135deg, #f57c00 0%, #ffb74d 100%);
	border-color: #ef6c00;
}
</style>
