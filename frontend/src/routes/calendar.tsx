import { createRoute, Navigate } from "@tanstack/react-router"
import { useAuth } from "@frontend/contexts/AuthContext"
import CalendarPage from "@frontend/pages/CalendarPage"
import { Route as RootRoute } from "./__root"

function CalendarRouteComponent() {
  const { isAuthenticated } = useAuth()

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"></div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto">
        <CalendarPage />
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/calendar",
  component: CalendarRouteComponent
})
