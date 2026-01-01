import { createRoute } from "@tanstack/react-router"
import PersonalProfilePage from "@frontend/pages/PersonalProfilePage"
import { Route as RootRoute } from "./__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/profile",
  component: PersonalProfilePage
})
