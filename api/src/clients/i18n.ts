import { Paths } from '@api/paths'
import { I18n } from 'i18n'

/**
 * Internationalization (i18n) instance.
 * Supports 'cs' and 'en' locales.
 */
export const i18n = new I18n({
	locales: ['cs', 'en'],
	directory: Paths.I18n,
	defaultLocale: 'en',
	objectNotation: true
})
