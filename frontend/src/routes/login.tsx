import { createRoute, Navigate } from "@tanstack/react-router"
import { useAuth } from "@frontend/contexts/AuthContext"
import LoginPage from "@frontend/pages/LoginPage"
import { Route as RootRoute } from "./__root"

function LoginRouteComponent() {
  const { isAuthenticated } = useAuth()

  // Redirect to calendar if already logged in
  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />
  }

  return <LoginPage />
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: LoginRouteComponent
})
