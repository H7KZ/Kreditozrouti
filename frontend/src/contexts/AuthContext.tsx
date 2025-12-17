import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import AuthService from "@/services/AuthService"

interface User {
  id: number
  email: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string) => Promise<void>
  signInConfirm: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated on mount
    const currentUser = AuthService.getCurrentUser()

    // Check if token is expired and clear if necessary
    if (currentUser && AuthService.isTokenExpired()) {
      AuthService.signOut()
      setUser(null)
    } else {
      setUser(currentUser)
    }
    setIsLoading(false)
  }, [])

  const signIn = async (email: string) => {
    await AuthService.signIn(email)
  }

  const signInConfirm = async (email: string, code: string) => {
    // Prevent double authentication
    if (user) {
      throw new Error("Already authenticated. Please sign out first.")
    }
    const response = await AuthService.signInConfirm(email, code)
    setUser(response.user)
  }

  const signOut = async () => {
    await AuthService.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signInConfirm,
        signOut
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
