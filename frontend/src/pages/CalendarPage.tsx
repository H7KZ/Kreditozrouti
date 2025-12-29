"use client"

import { createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar"
import { createEventsServicePlugin } from "@schedule-x/events-service"
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import "@schedule-x/theme-default/dist/index.css"
import "@schedule-x/theme-default/dist/index.css"
import Navbar from "../components/Navbar"
import { DarkModeProvider } from "../components/DarkModeSwitcher"

export default function CalendarPage() {
  const navigate = useNavigate()
  const eventsService = useState(() => createEventsServicePlugin())[0]

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    events: [
      {
        id: "1",
        title: "Test Event",
        start: Temporal.Now.zonedDateTimeISO(),
        end: Temporal.Now.zonedDateTimeISO().add({ hours: 1 })
      }
    ],
    plugins: [eventsService],
    callbacks: {
      onEventClick(calendarEvent) {
        navigate({ to: `/event/${calendarEvent.id}` })
      }
    }
  })

  return (
    <DarkModeProvider>
      <div className="flex min-h-screen flex-col dark:bg-gray-950">
        <Navbar />
        <div className="h-[800px] w-full flex-1 pt-16">
          <ScheduleXCalendar calendarApp={calendar} />
        </div>
      </div>
    </DarkModeProvider>
  )
}
