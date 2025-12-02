'use client'
import React, { useState } from 'react'
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-default/dist/index.css'

// We assume the polyfill is already in main.tsx, but this safety check doesn't hurt
if (!window.Temporal) {
  import('temporal-polyfill/global')
}

function CalendarApp() {
  const eventsService = useState(() => createEventsServicePlugin())[0]

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    events: [
      {
        id: '1',
        title: 'Test Event',
        // FIX: Passing the raw Temporal Object, NOT a string
        start: Temporal.Now.zonedDateTimeISO(),
        end: Temporal.Now.zonedDateTimeISO().add({ hours: 1 }),
      },
    ],
    plugins: [eventsService]
  })

  return (
    <div className='w-full h-[800px]'>
      <ScheduleXCalendar calendarApp={calendar} />
    </div>
  )
}

export default CalendarApp