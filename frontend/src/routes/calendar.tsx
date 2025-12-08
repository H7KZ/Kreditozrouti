import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import CalendarPage from '@/pages/CalendarPage'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/calendar',
  component: CalendarPage,
})
