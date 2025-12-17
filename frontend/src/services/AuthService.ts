import { generateCodeChallenge, generateCodeVerifier } from "@/utils/pkce"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:40080"

// PKCE spec: 43-128 chars, unreserved chars only
function isValidCodeVerifier(verifier: string): boolean {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)
}

// Check if token is expired
function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

interface SignInResponse {
  code: string
}

interface SignInConfirmResponse {
  code: string
  accessToken: string
  refreshToken: string
  user: {
    id: number
    email: string
  }
}

class AuthService {
  /**
   * Step 1: Request sign-in (generates PKCE challenge, sends email with 6-digit code)
   */
  async signIn(email: string): Promise<SignInResponse> {
    // Clear any previous attempt
    sessionStorage.removeItem("code_verifier")
    sessionStorage.removeItem("signin_email")

    // Generate PKCE challenge
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Store verifier in sessionStorage (needed for step 2)
    sessionStorage.setItem("code_verifier", codeVerifier)
    sessionStorage.setItem("signin_email", email)

    try {
      const response = await fetch(`${API_BASE}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code_challenge: codeChallenge })
      })

      if (!response.ok) {
        let errorMessage = "Sign-in failed"
        try {
          const error = await response.json()
          errorMessage = error.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        sessionStorage.removeItem("code_verifier")
        sessionStorage.removeItem("signin_email")
        throw new Error(errorMessage)
      }

      return response.json()
    } catch (err) {
      // Clear storage on error
      sessionStorage.removeItem("code_verifier")
      sessionStorage.removeItem("signin_email")
      throw err
    }
  }

  /**
   * Step 2: Confirm sign-in with 6-digit code (verifies PKCE, returns JWT tokens)
   */
  async signInConfirm(email: string, code: string): Promise<SignInConfirmResponse> {
    const codeVerifier = sessionStorage.getItem("code_verifier")

    if (!codeVerifier) {
      throw new Error("No code verifier found. Please request a new sign-in code.")
    }

    // Validate code verifier format
    if (!isValidCodeVerifier(codeVerifier)) {
      sessionStorage.removeItem("code_verifier")
      sessionStorage.removeItem("signin_email")
      throw new Error("Invalid code verifier. Please request a new sign-in code.")
    }

    const response = await fetch(`${API_BASE}/auth/signin/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, code, code_verifier: codeVerifier })
    })

    if (!response.ok) {
      let errorMessage = "Verification failed"
      try {
        const error = await response.json()
        errorMessage = error.message || errorMessage
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data: SignInConfirmResponse = await response.json()

    // Store tokens securely
    localStorage.setItem("access_token", data.accessToken)
    localStorage.setItem("refresh_token", data.refreshToken)
    localStorage.setItem("user", JSON.stringify(data.user))

    // Clean up session storage
    sessionStorage.removeItem("code_verifier")
    sessionStorage.removeItem("signin_email")

    return data
  }

  /**
   * Sign out (invalidate tokens on server, clear local storage)
   */
  async signOut(): Promise<void> {
    const token = localStorage.getItem("access_token")

    if (token) {
      try {
        await fetch(`${API_BASE}/auth/signout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        })
      } catch {
        console.error("Sign-out request failed")
      }
    }

    // Clear local storage
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser() {
    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token")
  }

  /**
   * Get access token for API requests
   */
  getAccessToken(): string | null {
    const token = localStorage.getItem("access_token")
    // Check if token is expired
    if (token && isTokenExpired(token)) {
      this.signOut()
      return null
    }
    return token
  }

  /**
   * Check if token is expired without clearing it
   */
  isTokenExpired(token: string | null = null): boolean {
    const accessToken = token || localStorage.getItem("access_token")
    return isTokenExpired(accessToken)
  }
}

export default new AuthService()
