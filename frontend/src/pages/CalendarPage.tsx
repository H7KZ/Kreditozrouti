"use client"

import { createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar"
import { createEventsServicePlugin } from "@schedule-x/events-service"
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react"
import { useNavigate } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import "@schedule-x/theme-default/dist/index.css"
import "@schedule-x/theme-default/dist/index.css"
import { DarkModeProvider } from "../components/DarkModeSwitcher"
import Navbar from "../components/Navbar"
import { eventService } from "../services/EventService"
import type { Event } from "../types/event"

export default function CalendarPage() {
  const navigate = useNavigate()
  const eventsService = useState(() => createEventsServicePlugin())[0]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    events: [],
    plugins: [eventsService],
    callbacks: {
      onEventClick(calendarEvent) {
        navigate({ to: `/event/${calendarEvent.id}` })
      }
    }
  })

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)

        // Calculate date range (e.g., current month ± 3 months for better UX)
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0)

        const backendEvents = await eventService.getEvents({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })

        // Transform backend events to calendar format
        const calendarEvents = backendEvents
          .filter((event) => event.datetime) // Filter out events without datetime
          .map((event: Event) => {
            const eventDate = Temporal.Instant.from(new Date(event.datetime!).toISOString())
            const zonedDateTime = eventDate.toZonedDateTimeISO(Temporal.Now.timeZoneId())

            return {
              id: event.id,
              title: event.title || "Untitled Event",
              start: zonedDateTime,
              end: zonedDateTime.add({ hours: 1 }), // Default 1-hour duration
              description: event.description || undefined,
              location: event.place || undefined
            }
          })

        // Update calendar with fetched events
        eventsService.set(calendarEvents)
        setLoading(false)
      } catch (err) {
        console.error("Failed to fetch events:", err)
        setError(err instanceof Error ? err.message : "Failed to load events. Please try again.")
        setLoading(false)
      }
    }

    fetchEvents()
  }, [eventsService])

  return (
    <DarkModeProvider>
      <div className="flex min-h-screen flex-col dark:bg-gray-950">
        <Navbar />
        <div className="w-full flex-1 pt-16">
          {loading && (
            <div className="flex h-[800px] items-center justify-center">
              <p className="text-lg text-gray-600 dark:text-gray-400">Loading calendar events...</p>
            </div>
          )}
          {error && (
            <div className="flex h-[800px] items-center justify-center">
              <div className="rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
                <p className="font-semibold">Error loading events</p>
                <p>{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          {!loading && !error && (
            <div className="h-[800px]">
              <ScheduleXCalendar calendarApp={calendar} />
            </div>
          )}
        </div>
      </div>
    </DarkModeProvider>
  )
}
