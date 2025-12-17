import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import NotFoundPage from '@/pages/NotFoundPage'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '*',
  component: NotFoundPage
})

