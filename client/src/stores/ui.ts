import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { ViewMode } from '@client/types'

const STORAGE_KEY = 'kreditozrouti:ui'

interface PersistedUIState {
	viewMode: ViewMode
	sidebarCollapsed: boolean
	showLegend: boolean
}

/**
 * UI Store
 * Manages global UI state: view mode, sidebar, loading, etc.
 */
export const useUIStore = defineStore('ui', () => {
	// =========================================================================
	// STATE
	// =========================================================================

	/** Current view mode: course list or timetable */
	const viewMode = ref<ViewMode>('list')

	/** Whether the filter sidebar is collapsed */
	const sidebarCollapsed = ref(false)

	/** Whether the legend is shown */
	const showLegend = ref(false)

	/** Global loading state */
	const globalLoading = ref(false)

	/** Mobile menu open state */
	const mobileMenuOpen = ref(false)

	/** Filter panel mobile open state */
	const mobileFilterOpen = ref(false)

	// =========================================================================
	// COMPUTED
	// =========================================================================

	/** Whether we're in list view */
	const isListView = computed(() => viewMode.value === 'list')

	/** Whether we're in timetable view */
	const isTimetableView = computed(() => viewMode.value === 'timetable')

	// =========================================================================
	// ACTIONS
	// =========================================================================

	/** Set view mode */
	function setViewMode(mode: ViewMode) {
		viewMode.value = mode
		persist()
	}

	/** Switch to list view */
	function switchToListView() {
		setViewMode('list')
	}

	/** Switch to timetable view */
	function switchToTimetableView() {
		setViewMode('timetable')
	}

	/** Toggle view mode */
	function toggleViewMode() {
		setViewMode(viewMode.value === 'list' ? 'timetable' : 'list')
	}

	/** Toggle sidebar collapsed state */
	function toggleSidebar() {
		sidebarCollapsed.value = !sidebarCollapsed.value
		persist()
	}

	/** Set sidebar collapsed state */
	function setSidebarCollapsed(collapsed: boolean) {
		sidebarCollapsed.value = collapsed
		persist()
	}

	/** Toggle legend visibility */
	function toggleLegend() {
		showLegend.value = !showLegend.value
		persist()
	}

	/** Set legend visibility */
	function setShowLegend(show: boolean) {
		showLegend.value = show
		persist()
	}

	/** Set global loading state */
	function setGlobalLoading(loading: boolean) {
		globalLoading.value = loading
	}

	/** Toggle mobile menu */
	function toggleMobileMenu() {
		mobileMenuOpen.value = !mobileMenuOpen.value
	}

	/** Close mobile menu */
	function closeMobileMenu() {
		mobileMenuOpen.value = false
	}

	/** Toggle mobile filter panel */
	function toggleMobileFilter() {
		mobileFilterOpen.value = !mobileFilterOpen.value
	}

	/** Close mobile filter panel */
	function closeMobileFilter() {
		mobileFilterOpen.value = false
	}

	// =========================================================================
	// PERSISTENCE
	// =========================================================================

	function persist() {
		const state: PersistedUIState = {
			viewMode: viewMode.value,
			sidebarCollapsed: sidebarCollapsed.value,
			showLegend: showLegend.value,
		}
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	}

	function hydrate() {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		try {
			const state: PersistedUIState = JSON.parse(stored)
			viewMode.value = state.viewMode || 'list'
			sidebarCollapsed.value = state.sidebarCollapsed || false
			showLegend.value = state.showLegend || false
		} catch (e) {
			console.error('UI: Failed to hydrate from localStorage', e)
			localStorage.removeItem(STORAGE_KEY)
		}
	}

	// Hydrate on store creation
	hydrate()

	// =========================================================================
	// RETURN
	// =========================================================================

	return {
		// State
		viewMode,
		sidebarCollapsed,
		showLegend,
		globalLoading,
		mobileMenuOpen,
		mobileFilterOpen,

		// Computed
		isListView,
		isTimetableView,

		// Actions
		setViewMode,
		switchToListView,
		switchToTimetableView,
		toggleViewMode,
		toggleSidebar,
		setSidebarCollapsed,
		toggleLegend,
		setShowLegend,
		setGlobalLoading,
		toggleMobileMenu,
		closeMobileMenu,
		toggleMobileFilter,
		closeMobileFilter,
	}
})
