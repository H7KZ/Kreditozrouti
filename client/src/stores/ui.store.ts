import { STORAGE_KEYS } from '@client/constants/storage.ts'
import type { PersistedUIState, ViewMode } from '@client/types'
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

	const isListView = computed(() => viewMode.value === 'list')
	const isTimetableView = computed(() => viewMode.value === 'timetable')

	function persist() {
		saveToStorage<PersistedUIState>(STORAGE_KEYS.UI, {
			viewMode: viewMode.value,
			sidebarCollapsed: sidebarCollapsed.value,
			showLegend: showLegend.value,
		})
	}

	function hydrate() {
		const state = loadFromStorage<PersistedUIState>(STORAGE_KEYS.UI)
		if (!state) return
		viewMode.value = state.viewMode || 'list'
		sidebarCollapsed.value = state.sidebarCollapsed || false
		showLegend.value = state.showLegend || false
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
		isListView,
		isTimetableView,
		persist,
		hydrate,
		clearPersisted,
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
