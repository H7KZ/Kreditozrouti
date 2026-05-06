<script setup lang="ts">
import LanguageSwitcher from '@client/components/common/LanguageSwitcher.vue'
import { useCourseLabels } from '@client/composables'
import { useFiltersStore, useTimetableStore, useUIStore, useWizardStore } from '@client/stores'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
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
		class="h-[52px] bg-[var(--insis-surface)] border-b border-[var(--insis-border)] flex items-center px-4 gap-3 shrink-0 z-30 shadow-[var(--insis-shadow-sm)]"
	>
		<!-- Left: logo + plan info -->
		<div class="flex items-center gap-3 min-w-0">
			<router-link to="/" class="h-8 w-8 flex items-center justify-center shrink-0" :title="$t('pages.courses.changePlan')">
				<img src="/logo/kreditozrouti-transparent-cropped.png" alt="K" class="h-8 w-8 object-contain flex items-center justify-center shrink-0" />
			</router-link>
			<span class="text-[15px] font-semibold text-[var(--insis-blue)] hidden sm:block">{{ $t('pages.index.title') }}</span>

			<div class="w-px h-6 bg-[var(--insis-border)] shrink-0 hidden sm:block" />

			<div class="hidden md:flex flex-col min-w-0">
				<div class="text-[13px] font-medium text-[var(--insis-text)] truncate max-w-[400px]">
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
				class="insis-btn insis-btn-secondary hover:bg-red-500 hover:text-white hover:border-red-500"
				@click="handleClearTimetable"
			>
				<IconTrash class="h-3 w-3" />
				<span class="hidden sm:inline">{{ $t('pages.courses.clearTimetable') }}</span>
			</button>

			<button type="button" class="insis-btn insis-btn-secondary hover:bg-red-500 hover:text-white hover:border-red-500" @click="handleResetWizard">
				<span>{{ $t('pages.courses.changePlan') }}</span>
			</button>

			<div class="w-px h-6 bg-[var(--insis-border)] shrink-0" />
			<LanguageSwitcher />

			<!-- Mobile filter toggle -->
			<button type="button" class="insis-btn insis-btn-secondary lg:hidden" style="padding: 5px" @click="uiStore.toggleMobileFilter">
				<IconFunnel class="h-4 w-4" />
			</button>
		</div>
	</header>
</template>
