import { createRoute } from "@tanstack/react-router"
import LoginPage from "@/pages/LoginPage"
import { Route as RootRoute } from "./__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: LoginPage
})
