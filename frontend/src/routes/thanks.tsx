import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import ThanksPage from '@/pages/ThanksPage'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/thankssss',
  component: ThanksPage,
})
