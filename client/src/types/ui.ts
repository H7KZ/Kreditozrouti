import { ViewMode } from '@client/types'

export type ColorScheme = 'light' | 'dark' | 'system'

export interface PersistedUIState {
	viewMode: ViewMode
	sidebarCollapsed: boolean
	showLegend: boolean
	colorScheme: ColorScheme
}

export interface UIState {
	viewMode: ViewMode
	sidebarCollapsed: boolean
	showLegend: boolean
	globalLoading: boolean
	mobileMenuOpen: boolean
	mobileFilterOpen: boolean
}
