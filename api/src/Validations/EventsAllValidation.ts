import * as z from 'zod'

/**
 * Validation schema for event search query parameters.
 * Handles optional filtering by title, categories, and date ranges with automatic string-to-date coercion.
 */
const EventsAllValidation = z.object({
    title: z.string().nullable().optional(),

    date_from: z.preprocess(arg => {
        if (typeof arg == 'string' || arg instanceof Date) return new Date(arg)
    }, z.date().nullable().optional()),

    date_to: z.preprocess(arg => {
        if (typeof arg == 'string' || arg instanceof Date) return new Date(arg)
    }, z.date().nullable().optional()),

    categories: z.array(z.string()).nullable().optional()
})

export default EventsAllValidation
