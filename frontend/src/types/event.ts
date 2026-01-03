/**
 * Event type definitions matching the backend Event model
 */
export interface Event {
    id: string
    created_at: Date | string
    updated_at: Date | string
    title: string | null
    subtitle: string | null
    datetime: Date | string | null
    image_src: string | null
    image_alt: string | null
    description: string | null
    place: string | null
    author: string | null
    language: string | null
    registration_from: Date | string | null
    registration_url: string | null
    substitute_url: string | null
}

export interface CreateEventDto {
    title: string
    subtitle?: string | null
    datetime: string
    description?: string | null
    place?: string | null
    author?: string | null
    language?: string | null
    image_src?: string | null
    image_alt?: string | null
    registration_from?: string | null
    registration_url?: string | null
    substitute_url?: string | null
}

export interface UpdateEventDto extends Partial<CreateEventDto> {}

export interface GetEventsParams {
    startDate?: string
    endDate?: string
}

