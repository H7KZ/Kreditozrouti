import type { Event, CreateEventDto, UpdateEventDto, GetEventsParams } from "../types/event"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:40080"

/**
 * Event API Service
 * Handles all HTTP requests for event operations
 */
class EventService {
    /**
     * Get JWT token from localStorage
     */
    private getAuthToken(): string | null {
        return localStorage.getItem("auth_jwt")
    }

    /**
     * Get headers with authentication
     */
    private getHeaders(): HeadersInit {
        const headers: HeadersInit = {
            "Content-Type": "application/json"
        }

        const token = this.getAuthToken()
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }

        return headers
    }

    /**
     * Fetch events within a date range
     */
    async getEvents(params?: GetEventsParams): Promise<Event[]> {
        const queryParams = new URLSearchParams()

        if (params?.startDate) {
            queryParams.append("startDate", params.startDate)
        }
        if (params?.endDate) {
            queryParams.append("endDate", params.endDate)
        }

        const url = `${API_BASE}/events${queryParams.toString() ? `?${queryParams.toString()}` : ""}`

        const response = await fetch(url, {
            method: "GET",
            headers: this.getHeaders()
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Fetch a single event by ID
     */
    async getEventById(id: string): Promise<Event> {
        const response = await fetch(`${API_BASE}/events/${id}`, {
            method: "GET",
            headers: this.getHeaders()
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch event: ${response.statusText}`)
        }

        const data = await response.json()
        return (data as { event?: Event }).event ?? (data as Event)
    }

    /**
     * Create a new event
     */
    async createEvent(data: CreateEventDto): Promise<Event> {
        const response = await fetch(`${API_BASE}/events`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(`Failed to create event: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Update an event
     */
    async updateEvent(id: string, data: UpdateEventDto): Promise<Event> {
        const response = await fetch(`${API_BASE}/events/${id}`, {
            method: "PUT",
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        })

        if (!response.ok) {
            throw new Error(`Failed to update event: ${response.statusText}`)
        }

        return response.json()
    }

    /**
     * Delete an event
     */
    async deleteEvent(id: string): Promise<void> {
        const response = await fetch(`${API_BASE}/events/${id}`, {
            method: "DELETE",
            headers: this.getHeaders()
        })

        if (!response.ok) {
            throw new Error(`Failed to delete event: ${response.statusText}`)
        }
    }
}

// Export a singleton instance
export const eventService = new EventService()
