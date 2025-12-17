import { createRootRoute, Outlet } from '@tanstack/react-router'
import NotFoundPage from '@/pages/NotFoundPage'

function RootLayout() {
  return <Outlet />
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage
})
