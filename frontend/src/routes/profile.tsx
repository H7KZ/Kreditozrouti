import { createRoute } from "@tanstack/react-router"
// Používáme alias '@', který máš nastavený v projektu
import PersonalProfilePage from "@/pages/PersonalProfilePage"
import { Route as RootRoute } from "./__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/profile",
  component: PersonalProfilePage
})
