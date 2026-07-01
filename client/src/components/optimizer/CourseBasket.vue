<script setup lang="ts">
import type { CourseWithRelationsDTO } from '@shared/http/responses'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import IconX from '~icons/lucide/x'
import IconPlus from '~icons/lucide/plus'

const props = defineProps<{
	modelValue: number[]
	courses: CourseWithRelationsDTO[]
}>()

const emit = defineEmits<{
	(e: 'update:modelValue', v: number[]): void
}>()

const { t, locale } = useI18n()

const search = ref('')
const open = ref(false)

function courseTitle(c: CourseWithRelationsDTO): string {
	return (locale.value === 'cs' ? c.title_cs : c.title_en) ?? c.title ?? c.ident
}

const basketCourses = computed(() => props.courses.filter(c => props.modelValue.includes(c.id)))

const suggestions = computed(() => {
	if (!search.value.trim()) return []
	const q = search.value.toLowerCase()
	return props.courses
		.filter(c => !props.modelValue.includes(c.id))
		.filter(c => c.ident.toLowerCase().includes(q) || courseTitle(c).toLowerCase().includes(q))
		.slice(0, 8)
})

function add(id: number) {
	emit('update:modelValue', [...props.modelValue, id])
	search.value = ''
	open.value = false
}

function remove(id: number) {
	emit(
		'update:modelValue',
		props.modelValue.filter(x => x !== id)
	)
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
				<IconPlus class="h-3.5 w-3.5 shrink-0 text-(--insis-text-3)" />
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
					@mousedown.prevent="add(c.id)"
				>
					<span class="font-medium text-(--insis-text)">{{ c.ident }}</span>
					<span class="min-w-0 truncate text-xs text-(--insis-text-3)">{{ courseTitle(c) }}</span>
					<span v-if="c.ects" class="ml-auto shrink-0 text-xs text-(--insis-text-3)">{{ c.ects }} ECTS</span>
				</li>
			</ul>
		</div>
	</div>
</template>
