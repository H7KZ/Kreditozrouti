import AuthService from "@frontend/services/AuthService"

function getApiBase(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) return "http://localhost:40080"

  // Validate it's a valid URL
  try {
    new URL(url)
    return url
  } catch {
    console.error("Invalid VITE_API_URL:", url)
    return "http://localhost:40080"
  }
}

const API_BASE = getApiBase()

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = AuthService.getToken()

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers
  })

  if (response.status === 401) {
    // Token expired or invalid - sign out and redirect to login
    await AuthService.signOut()
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    let errorMessage = "Request failed"
    try {
      const error = await response.json()
      errorMessage = error.message || errorMessage
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return response.json()
}
