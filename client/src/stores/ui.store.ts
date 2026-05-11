import { STORAGE_KEYS } from '@client/constants/storage.ts'
import type { ColorScheme, PersistedUIState, ViewMode } from '@client/types'
import { loadFromStorage, removeFromStorage, saveToStorage } from '@client/utils/localstorage'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
	const viewMode = ref<ViewMode>('list')
	const sidebarCollapsed = ref(false)
	const showLegend = ref(false)
	const globalLoading = ref(false)
	const mobileMenuOpen = ref(false)
	const mobileFilterOpen = ref(false)
	const colorScheme = ref<ColorScheme>('system')

	const isListView = computed(() => viewMode.value === 'list')
	const isTimetableView = computed(() => viewMode.value === 'timetable')

	const effectiveColorScheme = computed<'light' | 'dark'>(() => {
		if (colorScheme.value === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
		return colorScheme.value
	})

	const isDark = computed(() => effectiveColorScheme.value === 'dark')

	function applyColorScheme() {
		const html = document.documentElement
		if (effectiveColorScheme.value === 'dark') {
			html.classList.add('dark')
			html.classList.remove('light')
		} else {
			html.classList.remove('dark')
			html.classList.add('light')
		}
		const meta = document.querySelector('meta[name="theme-color"]')
		if (meta) meta.setAttribute('content', effectiveColorScheme.value === 'dark' ? '#0f1117' : '#0066b3')
	}

	function setColorScheme(scheme: ColorScheme) {
		colorScheme.value = scheme
		applyColorScheme()
		persist()
	}

	// Singleton store — listener lives for the app's lifetime, no cleanup needed
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (colorScheme.value === 'system') applyColorScheme()
	})

	function persist() {
		saveToStorage<PersistedUIState>(STORAGE_KEYS.UI, {
			viewMode: viewMode.value,
			sidebarCollapsed: sidebarCollapsed.value,
			showLegend: showLegend.value,
			colorScheme: colorScheme.value,
		})
	}

	function hydrate() {
		const state = loadFromStorage<PersistedUIState>(STORAGE_KEYS.UI)
		if (!state) return
		viewMode.value = state.viewMode || 'list'
		sidebarCollapsed.value = state.sidebarCollapsed || false
		showLegend.value = state.showLegend || false
		colorScheme.value = state.colorScheme ?? 'system'
		applyColorScheme()
	}

	function clearPersisted() {
		removeFromStorage(STORAGE_KEYS.UI)
	}

	function setViewMode(mode: ViewMode) {
		viewMode.value = mode
		persist()
	}

	function toggleViewMode() {
		setViewMode(viewMode.value === 'list' ? 'timetable' : 'list')
	}

	function toggleLegend() {
		showLegend.value = !showLegend.value
		persist()
	}

	function setShowLegend(show: boolean) {
		showLegend.value = show
		persist()
	}

	function setGlobalLoading(loading: boolean) {
		globalLoading.value = loading
	}

	function toggleMobileMenu() {
		mobileMenuOpen.value = !mobileMenuOpen.value
	}

	function closeMobileMenu() {
		mobileMenuOpen.value = false
	}

	function toggleMobileFilter() {
		mobileFilterOpen.value = !mobileFilterOpen.value
	}

	function closeMobileFilter() {
		mobileFilterOpen.value = false
	}

	return {
		viewMode,
		sidebarCollapsed,
		showLegend,
		globalLoading,
		mobileMenuOpen,
		mobileFilterOpen,
		colorScheme,
		effectiveColorScheme,
		isDark,
		isListView,
		isTimetableView,
		persist,
		hydrate,
		clearPersisted,
		applyColorScheme,
		setColorScheme,
		setViewMode,
		switchToListView: () => setViewMode('list'),
		switchToTimetableView: () => setViewMode('timetable'),
		toggleViewMode,
		toggleLegend,
		setShowLegend,
		setGlobalLoading,
		toggleMobileMenu,
		closeMobileMenu,
		toggleMobileFilter,
		closeMobileFilter,
	}
})
