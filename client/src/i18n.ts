import { czechPluralRule, datetimeFormats, numberFormats } from '@client/utils/pluralization.ts'
import messages from '@intlify/unplugin-vue-i18n/messages'
import { createI18n } from 'vue-i18n'

// Load saved locale preference from localStorage
const savedLocale = localStorage.getItem('locale')
const defaultLocale = savedLocale && ['cs', 'en'].includes(savedLocale) ? savedLocale : 'cs'

export const i18n = createI18n({
	locale: defaultLocale,
	fallbackLocale: 'en',
	messages,
	globalInjection: true,
	legacy: false,
	allowComposition: true,
	// Czech pluralization rules
	pluralRules: {
		cs: czechPluralRule,
	},
	// Datetime formatting
	datetimeFormats,
	// Number formatting
	numberFormats,
})
