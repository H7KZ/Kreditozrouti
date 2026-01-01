import React, { createContext, useContext, useEffect, useState } from "react"
import AuthService, { type User } from "@frontend/services/AuthService"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string) => Promise<void>
  signInConfirm: (code: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentUser = AuthService.getUser()
    if (currentUser && AuthService.isAuthenticated()) {
      setUser(currentUser)
    }
    setIsLoading(false)
  }, [])

  const signIn = async (email: string) => {
    await AuthService.signIn(email)
  }

  const signInConfirm = async (code: string) => {
    const user = await AuthService.signInConfirm(code)
    setUser(user)
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
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
