<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
	html: string
}>()

interface TocEntry {
	id: string
	text: string
	level: 2 | 3
}

const activeId = ref('')

const entries = computed<TocEntry[]>(() => {
	if (!props.html) return []
	const parser = new DOMParser()
	const doc = parser.parseFromString(props.html, 'text/html')
	const headings = doc.querySelectorAll('h2, h3')
	return Array.from(headings).map((el) => ({
		id: el.id,
		text: el.textContent ?? '',
		level: parseInt(el.tagName[1]!) as 2 | 3,
	}))
})

let observer: IntersectionObserver | null = null

function setupObserver() {
	observer?.disconnect()
	observer = new IntersectionObserver(
		(observerEntries) => {
			for (const entry of observerEntries) {
				if (entry.isIntersecting) {
					activeId.value = entry.target.id
					break
				}
			}
		},
		{ rootMargin: '0px 0px -80% 0px', threshold: 0 },
	)
	for (const { id } of entries.value) {
		const el = document.getElementById(id)
		if (el) observer.observe(el)
	}
}

watch(
	() => props.html,
	() => {
		setTimeout(setupObserver, 50)
	},
	{ immediate: true },
)

onUnmounted(() => observer?.disconnect())
</script>

<template>
	<nav class="w-56 shrink-0">
		<div class="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
			<p class="mb-3 text-xs font-semibold uppercase tracking-wider text-insis-gray-500">On this page</p>
			<ul class="space-y-1">
				<li v-for="entry in entries" :key="entry.id">
					<a
						:href="`#${entry.id}`"
						:class="[
							'block truncate py-0.5 text-sm transition-colors hover:text-insis-blue',
							entry.level === 3 ? 'pl-3' : '',
							activeId === entry.id ? 'font-medium text-insis-blue' : 'text-insis-gray-600',
						]"
					>
						{{ entry.text }}
					</a>
				</li>
			</ul>
		</div>
	</nav>
</template>
