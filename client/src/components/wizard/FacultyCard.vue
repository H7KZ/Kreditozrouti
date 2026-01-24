<script setup lang="ts">
import { useFacultyName } from '@client/composables/useFacultyName'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Faculty {
	id?: string
	ident?: string
	code?: string
	value?: string | number
	name?: string
	nameCs?: string
	nameEn?: string
	count?: number
}

interface Props {
	faculty: Faculty
	selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	selected: false,
})

const emit = defineEmits<{
	select: [faculty: Faculty]
}>()

const { t } = useI18n()
const { getFacultyName } = useFacultyName()

// Get localized faculty name
const displayName = computed(() => getFacultyName(props.faculty))

// Get faculty code for display
const facultyCode = computed(() => {
	return String(props.faculty.code || props.faculty.ident || props.faculty.id || props.faculty.value || '')
})

// Study plans count
const studyPlansCount = computed(() => props.faculty.count || 0)

// Faculty icon based on code (visual enhancement)
const facultyIcon = computed(() => {
	const code = facultyCode.value
	const icons: Record<string, string> = {
		F1: '💰', // Finance
		FFU: '💰',
		F2: '🌍', // International Relations
		FMV: '🌍',
		F3: '📊', // Business
		FPH: '📊',
		F4: '💻', // Informatics
		FIS: '💻',
		F5: '📈', // Economics
		NF: '📈',
		F6: '👔', // Management
		FM: '👔',
	}
	return icons[code] || '🎓'
})
</script>

<template>
	<div
		class="faculty-card group cursor-pointer rounded border p-4 transition-all duration-150"
		:class="{
			'border-[#4a7eb8] bg-[#f0f7ff] ring-2 ring-[#4a7eb8]/20': selected,
			'border-[#d1d5db] bg-white hover:border-[#7b9ebd] hover:bg-[#f9fafb]': !selected,
		}"
		@click="emit('select', faculty)"
	>
		<div class="flex items-start gap-3">
			<!-- Icon -->
			<div class="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded bg-[#f3f4f6]" :class="{ 'bg-[#dbeafe]': selected }">
				{{ facultyIcon }}
			</div>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				<!-- Faculty Name -->
				<h3 class="font-medium text-[#1f2937] truncate" :class="{ 'text-[#1e4a7a]': selected }">
					{{ displayName }}
				</h3>

				<!-- Faculty Code -->
				<p class="text-xs text-[#6b7280] mt-0.5">
					{{ facultyCode }}
				</p>

				<!-- Study Plans Count -->
				<p v-if="studyPlansCount > 0" class="text-sm text-[#6b7280] mt-2">
					{{ t('wizard.faculty.studyPlansCount', { count: studyPlansCount }) }}
				</p>
			</div>

			<!-- Selection Indicator -->
			<div class="flex-shrink-0">
				<div v-if="selected" class="w-6 h-6 rounded-full bg-[#4a7eb8] flex items-center justify-center">
					<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div v-else class="w-6 h-6 rounded-full border-2 border-[#d1d5db] group-hover:border-[#7b9ebd]" />
			</div>
		</div>
	</div>
</template>

<style scoped>
.faculty-card:focus {
	outline: none;
	ring: 2px;
	ring-color: #4a7eb8;
}
</style>
