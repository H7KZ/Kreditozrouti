import { createRootRoute, Outlet, Navigate, useLocation } from '@tanstack/react-router'

function RootLayout() {

  return <Outlet />
}

export const Route = createRootRoute({
  component: RootLayout
})
