import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Faculty {
	id: string
	ident?: string
	code?: string
	name?: string
	nameCs?: string
	nameEn?: string
	value?: string | number
}

/**
 * Composable for getting localized faculty names
 * Supports multiple name sources and translation file lookups
 */
export function useFacultyName() {
	const { t, locale } = useI18n()

	/**
	 * Get localized faculty name
	 * Checks multiple possible sources in order of preference:
	 * 1. Explicit locale fields (nameCs/nameEn)
	 * 2. Translation file lookup by code/ident
	 * 3. Generic name field
	 * 4. Fallback to code/ident
	 */
	const getFacultyName = (faculty: Faculty | string): string => {
		// Handle string input (just faculty code)
		if (typeof faculty === 'string') {
			const translationKey = `faculties.${faculty}`
			const translated = t(translationKey)
			return translated !== translationKey ? translated : faculty
		}

		// Try locale-specific fields first
		if (locale.value === 'cs' && faculty.nameCs) {
			return faculty.nameCs
		}
		if (locale.value === 'en' && faculty.nameEn) {
			return faculty.nameEn
		}

		// Try translation file lookup
		const code = faculty.code || faculty.ident || faculty.id || String(faculty.value || '')
		const translationKey = `faculties.${code}`
		const translated = t(translationKey)

		// If translation exists (not same as key), use it
		if (translated !== translationKey) {
			return translated
		}

		// Fallback to generic name or code
		return faculty.name || code
	}

	/**
	 * Computed faculty name for reactive use
	 * Usage: const name = facultyName(facultyObject)
	 */
	const facultyName = (faculty: Faculty | string) => computed(() => getFacultyName(faculty))

	return {
		getFacultyName,
		facultyName,
	}
}
