import { ViewMode } from '@client/types'

export interface PersistedUIState {
	viewMode: ViewMode
	sidebarCollapsed: boolean
	showLegend: boolean
}

export interface UIState {
	viewMode: ViewMode
	sidebarCollapsed: boolean
	showLegend: boolean
	globalLoading: boolean
	mobileMenuOpen: boolean
	mobileFilterOpen: boolean
}
