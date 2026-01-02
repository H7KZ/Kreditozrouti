import { createRoute } from "@tanstack/react-router"
import NotFoundPage from "@frontend/pages/NotFoundPage"
import { Route as RootRoute } from "./__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "*",
  component: NotFoundPage
})
