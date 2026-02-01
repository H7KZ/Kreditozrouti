/**
 * Czech pluralization rule
 * Czech has 3 plural forms:
 * - 1 = singular (1 předmět)
 * - 2-4 = few (2-4 předměty)
 * - 0, 5+ = many (0, 5+ předmětů)
 *
 * @param choice - The count/number to determine plural form
 * @param choicesLength - Number of available plural forms in the message
 * @returns Index of the plural form to use
 */
export function czechPluralRule(choice: number, choicesLength: number): number {
	// Handle zero and negative numbers
	if (choice === 0) {
		return choicesLength === 3 ? 2 : 0
	}

	const absChoice = Math.abs(choice)

	// Singular: exactly 1
	if (absChoice === 1) {
		return 0
	}

	// Few: 2-4
	if (absChoice >= 2 && absChoice <= 4) {
		return choicesLength < 3 ? 1 : 1
	}

	// Many: 5+
	return choicesLength < 3 ? 1 : 2
}

/**
 * Datetime formats for localization
 * Uses ECMA-402 Intl.DateTimeFormat options
 */
export const datetimeFormats: Record<string, Record<string, Intl.DateTimeFormatOptions>> = {
	cs: {
		short: {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		},
		long: {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long',
		},
		time: {
			hour: '2-digit',
			minute: '2-digit',
		},
		datetime: {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		},
		monthYear: {
			year: 'numeric',
			month: 'long',
		},
		weekday: {
			weekday: 'long',
		},
		weekdayShort: {
			weekday: 'short',
		},
	},
	en: {
		short: {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		},
		long: {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			weekday: 'long',
		},
		time: {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		},
		datetime: {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		},
		monthYear: {
			year: 'numeric',
			month: 'long',
		},
		weekday: {
			weekday: 'long',
		},
		weekdayShort: {
			weekday: 'short',
		},
	},
}

/**
 * Number formats for localization
 * Uses ECMA-402 Intl.NumberFormat options
 */
export const numberFormats: Record<string, Record<string, Intl.NumberFormatOptions>> = {
	cs: {
		decimal: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		},
		integer: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		},
		ects: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 1,
		},
		percent: {
			style: 'percent',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		},
		percentDecimal: {
			style: 'percent',
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		},
	},
	en: {
		decimal: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		},
		integer: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		},
		ects: {
			style: 'decimal',
			minimumFractionDigits: 0,
			maximumFractionDigits: 1,
		},
		percent: {
			style: 'percent',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		},
		percentDecimal: {
			style: 'percent',
			minimumFractionDigits: 1,
			maximumFractionDigits: 1,
		},
	},
}
