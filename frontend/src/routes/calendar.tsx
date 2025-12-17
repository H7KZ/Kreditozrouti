import { createRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'
import CalendarPage from '@/pages/CalendarPage'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

function CalendarRouteComponent() {
  const { isAuthenticated, user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate({ to: '/' })
    } catch {
      console.error('Sign out failed')
      setSignOutError('Failed to sign out. Please try again.')
      setIsSigningOut(false)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Diář Fisáka</h1>
          <p className="text-sm text-gray-600">{user?.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {signOutError && (
            <p className="text-sm text-red-600">{signOutError}</p>
          )}
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
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
