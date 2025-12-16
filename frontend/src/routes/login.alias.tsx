import { createRoute, Navigate } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import LoginPage from '@/pages/LoginPage'
import { useAuth } from '@/contexts/AuthContext'

function LoginAliasRouteComponent() {
  const { isAuthenticated } = useAuth()

  // Redirect to calendar if already logged in
  if (isAuthenticated) {
    return <Navigate to="/calendar" replace />
  }

  return <LoginPage />
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/login',
  component: LoginAliasRouteComponent
})
