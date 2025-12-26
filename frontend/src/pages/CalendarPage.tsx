"use client"

import { createViewDay, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar"
import { createEventsServicePlugin } from "@schedule-x/events-service"
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react"
import { useState } from "react"
import "@schedule-x/theme-default/dist/index.css"
import Navbar from "../components/Navbar"

function CalendarApp() {
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
    plugins: [eventsService]
  })

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="h-[800px] w-full flex-1 pt-16">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  )
}

export default CalendarApp
