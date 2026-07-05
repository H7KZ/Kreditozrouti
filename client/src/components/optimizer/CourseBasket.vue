<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@kreditozrouti/core/http/responses'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { fetchCourses } from '@client/services/courseService'
import { useWizardStore } from '@client/stores'
import IconX from '~icons/lucide/x'
import IconPlus from '~icons/lucide/plus'
import IconLoaderCircle from '~icons/lucide/loader-circle'

const props = defineProps<{
	modelValue: number[]
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', v: number[]): void
	(e: 'update:ects', total: number): void
}>()

const { t, locale } = useI18n()
const wizardStore = useWizardStore()

const search = ref('')
const open = ref(false)
const suggestions = ref<CourseWithRelationsDTO[]>([])
const basketCourses = ref<CourseWithRelationsDTO[]>([])
const searching = ref(false)

function courseTitle(c: CourseWithRelationsDTO): string {
	return (locale.value === 'cs' ? c.title_cs : c.title_en) ?? c.title ?? c.ident
}

// Load full objects for persisted basket IDs on mount
onMounted(async () => {
	if (props.modelValue.length === 0) return
	const result = await fetchCourses({ ids: props.modelValue, limit: props.modelValue.length, offset: 0 })
	basketCourses.value = result.data
	emitBasket()
})

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, q => {
	if (searchTimer) clearTimeout(searchTimer)
	if (!q.trim()) {
		suggestions.value = []
		return
	}
	searchTimer = setTimeout(async () => {
		searching.value = true
		try {
			const result = await fetchCourses({
				title: q,
				study_plan_ids: wizardStore.studyPlanIds.length > 0 ? wizardStore.studyPlanIds : undefined,
				limit: 8,
				offset: 0
			})
			suggestions.value = result.data.filter(c => !props.modelValue.includes(c.id))
		} finally {
			searching.value = false
		}
	}, 300)
})

function emitBasket() {
	const ids = basketCourses.value.map(c => c.id)
	const ects = basketCourses.value.reduce((sum, c) => sum + (c.ects ?? 0), 0)
	emit('update:modelValue', ids)
	emit('update:ects', ects)
}

function add(course: CourseWithRelationsDTO) {
	basketCourses.value.push(course)
	emitBasket()
	search.value = ''
	suggestions.value = []
	open.value = false
}

function remove(id: number) {
	basketCourses.value = basketCourses.value.filter(c => c.id !== id)
	emitBasket()
}

function onBlur() {
	setTimeout(() => {
		open.value = false
	}, 150)
}
</script>

<template>
	<div class="flex flex-col gap-2 p-4">
		<h3 class="text-sm font-semibold text-(--insis-text)">
			{{ t('components.optimizer.CourseBasket.title') }}
		</h3>

		<!-- Basket items -->
		<ul v-if="basketCourses.length > 0" class="flex flex-col gap-1">
			<li v-for="c in basketCourses" :key="c.id" class="flex items-center justify-between gap-2 rounded bg-(--insis-surface-2) px-2 py-1 text-sm">
				<span class="min-w-0">
					<span class="font-medium text-(--insis-text)">{{ c.ident }}</span>
					<span class="ml-1.5 truncate text-xs text-(--insis-text-3)">{{ courseTitle(c) }}</span>
				</span>
				<button
					type="button"
					class="ml-1 shrink-0 cursor-pointer text-(--insis-text-3) hover:text-(--insis-danger)"
					:aria-label="t('common.remove')"
					@click="remove(c.id)"
				>
					<IconX class="h-3.5 w-3.5" />
				</button>
			</li>
		</ul>

		<p v-else class="text-xs text-(--insis-text-3)">
			{{ t('components.optimizer.CourseBasket.empty') }}
		</p>

		<!-- Search input + dropdown -->
		<div class="relative">
			<div class="flex items-center gap-1.5 rounded border border-(--insis-border) bg-(--insis-surface) px-2 py-1">
				<IconLoaderCircle v-if="searching" class="h-3.5 w-3.5 shrink-0 animate-spin text-(--insis-text-3)" />
				<IconPlus v-else class="h-3.5 w-3.5 shrink-0 text-(--insis-text-3)" />
				<input
					v-model="search"
					type="text"
					class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-(--insis-text-3)"
					:placeholder="t('components.optimizer.CourseBasket.searchPlaceholder')"
					@focus="open = true"
					@blur="onBlur"
					@input="open = true"
				/>
			</div>
			<ul
				v-if="open && suggestions.length > 0"
				class="absolute z-30 mt-0.5 w-full overflow-hidden rounded border border-(--insis-border) bg-(--insis-surface) shadow-md"
			>
				<li
					v-for="c in suggestions"
					:key="c.id"
					class="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-(--insis-surface-2)"
					@mousedown.prevent="add(c)"
				>
					<span class="font-medium text-(--insis-text)">{{ c.ident }}</span>
					<span class="min-w-0 truncate text-xs text-(--insis-text-3)">{{ courseTitle(c) }}</span>
					<span v-if="c.ects" class="ml-auto shrink-0 text-xs text-(--insis-text-3)">{{ c.ects }} ECTS</span>
				</li>
			</ul>
		</div>
	</div>
</template>
