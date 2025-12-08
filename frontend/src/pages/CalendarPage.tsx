'use client'
import { useState } from 'react'
import { useCalendarApp, ScheduleXCalendar } from '@schedule-x/react'
import {
  createViewDay,
  createViewMonthGrid,
  createViewWeek,
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import '@schedule-x/theme-default/dist/index.css'
import Navbar from '../components/Navbar'

function CalendarApp() {
  const eventsService = useState(() => createEventsServicePlugin())[0]

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid()],
    events: [
      {
        id: '1',
        title: 'Test Event',
        start: Temporal.Now.zonedDateTimeISO(),
        end: Temporal.Now.zonedDateTimeISO().add({ hours: 1 }),
      },
    ],
    plugins: [eventsService]
  })

  return (
    <>
      <Navbar />
      <div className='w-full h-[800px]'>
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </>
  )
}

export default CalendarApp