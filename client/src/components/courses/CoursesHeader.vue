<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import ThemeToggle from '@client/components/common/ThemeToggle.vue'
import { useCourseLabels } from '@client/composables'
import { useFiltersStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import IconFunnel from '~icons/lucide/funnel'
import IconTrash from '~icons/lucide/trash-2'

const { t } = useI18n()
const router = useRouter()
const filtersStore = useFiltersStore()
const timetableStore = useTimetableStore()
const uiStore = useUIStore()
const wizardStore = useWizardStore()

const { getSemesterLabel } = useCourseLabels()

const studyPlanInfo = computed(() => ({
	titles: wizardStore.studyPlanTitles || [],
	idents: wizardStore.studyPlanIdents || [],
}))

const coursesInfo = computed(() => ({
	years: filtersStore.filters.years,
	semester: filtersStore.filters.semesters?.map((s) => getSemesterLabel(s)).join(', '),
}))

const selectedCoursesCount = computed(() => timetableStore.selectedCourseIds.length)

function handleResetWizard() {
	if (!confirm(t('pages.courses.changePlanConfirm'))) return
	wizardStore.reset()
	timetableStore.clearAll()
	router.push('/')
}

function handleClearTimetable() {
	if (!confirm(t('pages.courses.clearTimetableConfirm'))) return
	timetableStore.clearAll()
}
</script>

<template>
	<header
		class="z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-[var(--insis-border)] bg-[var(--insis-surface)] px-4 shadow-[var(--insis-shadow-sm)]"
	>
		<!-- Left: logo + plan info -->
		<div class="flex min-w-0 items-center gap-3">
			<router-link to="/" class="flex h-8 w-8 shrink-0 items-center justify-center" :title="$t('pages.courses.changePlan')">
				<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="flex h-8 w-8 shrink-0 items-center justify-center object-contain" />
			</router-link>
			<span class="hidden text-[15px] font-semibold text-[var(--insis-blue)] sm:block">{{ $t('pages.index.title') }}</span>

			<div class="hidden h-6 w-px shrink-0 bg-[var(--insis-border)] sm:block" />

			<div class="hidden min-w-0 flex-col md:flex">
				<div class="max-w-[400px] truncate text-[13px] font-medium text-[var(--insis-text)]">
					{{ studyPlanInfo.titles.length > 0 ? studyPlanInfo.titles.join(' / ') : $t('pages.courses.studyPlanFallback') }}
				</div>
				<div class="text-[11px] text-[var(--insis-text-3)]">
					{{ $t('pages.courses.searchingForCourses', { semester: coursesInfo.semester, year: coursesInfo.years?.join('/') }) }}
				</div>
			</div>
		</div>

		<div class="flex-1" />

		<!-- Right: actions -->
		<div class="flex items-center gap-2">
			<button
				v-if="selectedCoursesCount > 0"
				type="button"
				class="insis-btn insis-btn-secondary hover:border-[var(--insis-danger)] hover:bg-[var(--insis-danger)] hover:text-[var(--insis-text-inv)]"
				:aria-label="$t('pages.courses.clearTimetable')"
				@click="handleClearTimetable"
			>
				<IconTrash class="h-3 w-3" aria-hidden="true" />
				<span class="hidden sm:inline" aria-hidden="true">{{ $t('pages.courses.clearTimetable') }}</span>
			</button>

			<button
				type="button"
				class="insis-btn insis-btn-secondary hover:border-[var(--insis-danger)] hover:bg-[var(--insis-danger)] hover:text-[var(--insis-text-inv)]"
				@click="handleResetWizard"
			>
				<span>{{ $t('pages.courses.changePlan') }}</span>
			</button>

			<div class="h-6 w-px shrink-0 bg-[var(--insis-border)]" />
			<ThemeToggle />
			<LanguageSwitcher />

			<!-- Mobile filter toggle -->
			<button
				type="button"
				class="insis-btn insis-btn-secondary min-h-[44px] min-w-[44px] justify-center lg:hidden"
				:aria-label="$t('common.openFilters')"
				@click="uiStore.toggleMobileFilter"
			>
				<IconFunnel class="h-4 w-4" aria-hidden="true" />
			</button>
		</div>
	</header>
</template>
