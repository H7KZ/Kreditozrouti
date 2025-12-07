import { createRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import LoginPage from '@/pages/LoginPage'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: LoginPage,
})
