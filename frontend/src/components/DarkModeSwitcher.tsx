import { createContext, useContext, useEffect, useState } from "react"

interface DarkModeContextType {
  isDark: boolean
  toggleDarkMode: () => void
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined)

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load dark mode preference from localStorage on mount
  useEffect(() => {
    const savedPreference = localStorage.getItem("darkMode")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    const shouldBeDark = savedPreference === "true" || (savedPreference === null && prefersDark)
    setIsDark(shouldBeDark)
    setIsLoaded(true)
  }, [])

  // Apply dark mode class to html element
  useEffect(() => {
    if (!isLoaded) return

    const htmlElement = document.documentElement
    if (isDark) {
      htmlElement.classList.add("dark", "is-dark")
    } else {
      htmlElement.classList.remove("dark", "is-dark")
    }
    localStorage.setItem("darkMode", isDark.toString())
  }, [isDark, isLoaded])

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev)
  }

  return <DarkModeContext.Provider value={{ isDark, toggleDarkMode }}>{children}</DarkModeContext.Provider>
}

export function useDarkMode() {
  const context = useContext(DarkModeContext)
  if (context === undefined) {
    throw new Error("useDarkMode must be used within a DarkModeProvider")
  }
  return context
}
