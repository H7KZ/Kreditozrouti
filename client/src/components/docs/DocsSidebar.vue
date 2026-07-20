<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { NavItem, NavSection } from '@client/composables/useDocsNav'
import IconChevronDown from '~icons/lucide/chevron-down'
import IconMenu from '~icons/lucide/menu'
import IconX from '~icons/lucide/x'

defineProps<{
	topLevel: NavItem[]
	sections: NavSection[]
}>()

const mobileOpen = ref(false)
const collapsed = ref<Record<string, boolean>>({})

function toggleSection(label: string) {
	collapsed.value[label] = !collapsed.value[label]
}
</script>

<template>
	<!-- Mobile toggle -->
	<button
		type="button"
		class="fixed right-4 bottom-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-(--insis-blue) text-white shadow-lg lg:hidden"
		:aria-label="mobileOpen ? 'Close navigation' : 'Open navigation'"
		@click="mobileOpen = !mobileOpen"
	>
		<IconX v-if="mobileOpen" class="h-5 w-5" />
		<IconMenu v-else class="h-5 w-5" />
	</button>

	<!-- Backdrop -->
	<Transition
		enter-active-class="transition-opacity duration-200"
		enter-from-class="opacity-0"
		leave-active-class="transition-opacity duration-200"
		leave-to-class="opacity-0"
	>
		<div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="mobileOpen = false" />
	</Transition>

	<!-- Sidebar panel -->
	<Transition
		enter-active-class="transition-transform duration-200 ease-out"
		enter-from-class="-translate-x-full"
		enter-to-class="translate-x-0"
		leave-active-class="transition-transform duration-200 ease-in"
		leave-from-class="translate-x-0"
		leave-to-class="-translate-x-full"
	>
		<nav
			v-show="mobileOpen"
			class="fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto bg-(--insis-surface) p-5 shadow-xl lg:hidden"
			aria-label="Documentation navigation"
		>
			<ul class="space-y-0.5">
				<li v-for="item in topLevel" :key="item.path">
					<RouterLink
						:to="item.path"
						:class="[
							'block rounded px-2 py-1.5 text-sm transition-colors',
							item.active
								? 'bg-(--insis-blue-subtle) font-medium text-(--insis-blue)'
								: 'text-(--insis-text-2) hover:bg-(--insis-surface-2) hover:text-(--insis-text)'
						]"
						@click="mobileOpen = false"
					>
						{{ item.title }}
					</RouterLink>
				</li>

				<li v-for="section in sections" :key="section.label" class="pt-3">
					<button
						type="button"
						class="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold tracking-wider text-(--insis-gray-500) uppercase"
						@click="toggleSection(section.label)"
					>
						{{ section.label }}
						<IconChevronDown :class="['h-3.5 w-3.5 transition-transform', collapsed[section.label] && 'rotate-180']" />
					</button>
					<ul v-if="!collapsed[section.label]" class="mt-0.5 space-y-0.5">
						<li v-for="item in section.items" :key="item.path">
							<RouterLink
								:to="item.path"
								:class="[
									'block rounded px-2 py-1.5 pl-4 text-sm transition-colors',
									item.active
										? 'bg-(--insis-blue-subtle) font-medium text-(--insis-blue)'
										: 'text-(--insis-text-2) hover:bg-(--insis-surface-2) hover:text-(--insis-text)'
								]"
								@click="mobileOpen = false"
							>
								{{ item.title }}
							</RouterLink>
						</li>
					</ul>
				</li>
			</ul>
		</nav>
	</Transition>

	<!-- Desktop sidebar (always visible) -->
	<nav class="hidden w-56 shrink-0 lg:block" aria-label="Documentation navigation">
		<div class="sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
			<ul class="space-y-0.5">
				<li v-for="item in topLevel" :key="item.path">
					<RouterLink
						:to="item.path"
						:class="[
							'block rounded px-2 py-1.5 text-sm transition-colors',
							item.active
								? 'bg-(--insis-blue-subtle) font-medium text-(--insis-blue)'
								: 'text-(--insis-text-2) hover:bg-(--insis-surface-2) hover:text-(--insis-text)'
						]"
					>
						{{ item.title }}
					</RouterLink>
				</li>

				<li v-for="section in sections" :key="section.label" class="pt-3">
					<button
						type="button"
						class="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold tracking-wider text-(--insis-gray-500) uppercase"
						@click="toggleSection(section.label)"
					>
						{{ section.label }}
						<IconChevronDown :class="['h-3.5 w-3.5 transition-transform', collapsed[section.label] && 'rotate-180']" />
					</button>
					<ul v-if="!collapsed[section.label]" class="mt-0.5 space-y-0.5">
						<li v-for="item in section.items" :key="item.path">
							<RouterLink
								:to="item.path"
								:class="[
									'block rounded px-2 py-1.5 pl-4 text-sm transition-colors',
									item.active
										? 'bg-(--insis-blue-subtle) font-medium text-(--insis-blue)'
										: 'text-(--insis-text-2) hover:bg-(--insis-surface-2) hover:text-(--insis-text)'
								]"
							>
								{{ item.title }}
							</RouterLink>
						</li>
					</ul>
				</li>
			</ul>
		</div>
	</nav>
</template>
