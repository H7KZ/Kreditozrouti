import { createRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import CalendarPage from '@/pages/CalendarPage'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

function CalendarRouteComponent() {
  const { isAuthenticated, user, signOut } = useAuth()
  const navigate = useNavigate()

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diář Fisáka</h1>
          <p className="text-sm text-gray-600">{user?.email}</p>
        </div>
        <Button
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Sign Out
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto">
        <CalendarPage />
      </div>
    </div>
  )
}

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/calendar',
  component: CalendarRouteComponent
})
