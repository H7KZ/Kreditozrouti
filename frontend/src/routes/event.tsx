import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import EventPage from '@/pages/EventPage'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/event/$eventId',
  component: EventPage,
})