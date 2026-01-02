import { createRoute, Navigate } from "@tanstack/react-router"
import { useAuth } from "@frontend/contexts/AuthContext"
import SignInConfirmPage from "@frontend/pages/SignInConfirmPage.tsx"
import { Route as RootRoute } from "./__root"

function SignInConfirmRouteComponent() {
  const { isAuthenticated } = useAuth()

  // Redirect to calendar if already logged in
  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />
  }

  return <SignInConfirmPage />
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/auth/signin/confirm",
  component: SignInConfirmRouteComponent
})
