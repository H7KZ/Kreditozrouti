import { createRoute } from "@tanstack/react-router"
import EventPage from "@/pages/EventPage"
import { Route as RootRoute } from "./__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/event/$eventId",
  component: EventPage
})
