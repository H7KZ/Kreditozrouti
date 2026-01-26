import type { PersistedUIState, UIState, ViewMode } from '@client/types'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'kreditozrouti:ui'

/**
 * UI Store
 * Manages global UI state: view mode, sidebar, loading, etc.
 */
export const useUIStore = defineStore('ui', {
	state: (): UIState => ({
		viewMode: 'list',
		sidebarCollapsed: false,
		showLegend: false,
		globalLoading: false,
		mobileMenuOpen: false,
		mobileFilterOpen: false,
	}),

	getters: {
		/** Whether we're in list view */
		isListView(): boolean {
			return this.viewMode === 'list'
		},

		/** Whether we're in timetable view */
		isTimetableView(): boolean {
			return this.viewMode === 'timetable'
		},
	},

	actions: {
		/** Set view mode */
		setViewMode(mode: ViewMode) {
			this.viewMode = mode
			this.persist()
		},

		/** Switch to list view */
		switchToListView() {
			this.setViewMode('list')
		},

		/** Switch to timetable view */
		switchToTimetableView() {
			this.setViewMode('timetable')
		},

		/** Toggle view mode */
		toggleViewMode() {
			this.setViewMode(this.viewMode === 'list' ? 'timetable' : 'list')
		},

		/** Toggle legend visibility */
		toggleLegend() {
			this.showLegend = !this.showLegend
			this.persist()
		},

		/** Set legend visibility */
		setShowLegend(show: boolean) {
			this.showLegend = show
			this.persist()
		},

		/** Set global loading state */
		setGlobalLoading(loading: boolean) {
			this.globalLoading = loading
		},

		/** Toggle mobile menu */
		toggleMobileMenu() {
			this.mobileMenuOpen = !this.mobileMenuOpen
		},

		/** Close mobile menu */
		closeMobileMenu() {
			this.mobileMenuOpen = false
		},

		/** Toggle mobile filter panel */
		toggleMobileFilter() {
			this.mobileFilterOpen = !this.mobileFilterOpen
		},

		/** Close mobile filter panel */
		closeMobileFilter() {
			this.mobileFilterOpen = false
		},

		persist() {
			const state: PersistedUIState = {
				viewMode: this.viewMode,
				sidebarCollapsed: this.sidebarCollapsed,
				showLegend: this.showLegend,
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
		},
	},

	hydrate(storeState) {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) return

		try {
			const state: PersistedUIState = JSON.parse(stored)
			storeState.viewMode = state.viewMode || 'list'
			storeState.sidebarCollapsed = state.sidebarCollapsed || false
			storeState.showLegend = state.showLegend || false
		} catch (e) {
			console.error('UI: Failed to hydrate from localStorage', e)
			localStorage.removeItem(STORAGE_KEY)
		}
	},
})
