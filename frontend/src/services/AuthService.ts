import type SignInConfirmRequest from "@api/Controllers/Auth/types/SignInConfirmRequest.ts"
import type SignInConfirmResponse from "@api/Controllers/Auth/types/SignInConfirmResponse.ts"
import type SignInRequest from "@api/Controllers/Auth/types/SignInRequest.ts"
import { generateCodeChallenge, generateCodeVerifier } from "@frontend/utils/pkce"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:40080"

export interface User {
  userId: number
  iat: number
  iss: string
  aud: string
  exp: number
}

class AuthService {
  private static STORAGE_KEYS = {
    ACCESS_TOKEN: "auth_jwt",
    CODE_VERIFIER: "auth_code_verifier",
    SIGNIN_EMAIL: "auth_signin_email"
  }

  /**
   * Step 1: Request Login
   * Generates PKCE challenge and requests the verification code.
   */
  async signIn(email: string): Promise<void> {
    this.clearSessionData()

    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)

    localStorage.setItem(AuthService.STORAGE_KEYS.CODE_VERIFIER, verifier)
    localStorage.setItem(AuthService.STORAGE_KEYS.SIGNIN_EMAIL, email)

    const response = await fetch(`${API_BASE}/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code_challenge: challenge
      } as SignInRequest)
    })

    if (!response.ok) {
      this.clearSessionData()
      throw await this.handleError(response)
    }
  }

  /**
   * Step 2: Confirm Login
   * Exchanges the code and verifier for a JWT.
   */
  async signInConfirm(code: string): Promise<User> {
    const verifier = localStorage.getItem(AuthService.STORAGE_KEYS.CODE_VERIFIER)

    if (!verifier) {
      throw new Error("Missing request context. Please try logging in again.")
    }

    const response = await fetch(`${API_BASE}/auth/signin/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_code: code,
        code_verifier: verifier
      } as SignInConfirmRequest)
    })

    if (!response.ok) {
      throw await this.handleError(response)
    }

    const data: SignInConfirmResponse = await response.json()

    localStorage.setItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN, data.jwt)
    this.clearSessionData()

    const decoded = this.getUserFromToken(data.jwt)
    return decoded!
  }

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    const token = this.getToken()

    if (token) {
      try {
        await fetch(`${API_BASE}/auth/signout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (e) {
        console.warn("Server-side logout failed", e)
      }
    }

    localStorage.removeItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN)
    window.location.href = "/login"
  }

  /**
   * Utility: Get Token
   */
  getToken(): string | null {
    return localStorage.getItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN)
  }

  /**
   * Utility: Check if authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false

    const user = this.getUserFromToken(token)
    if (!user || (user.exp && user.exp * 1000 < Date.now())) {
      this.signOut() // Auto cleanup
      return false
    }
    return true
  }

  /**
   * Utility: Decode JWT payload
   */
  getUser(): User | null {
    const token = this.getToken()
    return token ? this.getUserFromToken(token) : null
  }

  private getUserFromToken(token: string): User | null {
    try {
      const base64Url = token.split(".")[1]
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      )
      const parsed = JSON.parse(jsonPayload)
      return parsed
    } catch (err) {
      console.warn("[Auth] Failed to decode JWT", err)
      return null
    }
  }

  private async handleError(response: Response): Promise<Error> {
    try {
      const errorData = await response.json()
      return new Error(errorData.message || `Error ${response.status}`)
    } catch {
      return new Error(`HTTP Error ${response.status}`)
    }
  }

  private clearSessionData() {
    localStorage.removeItem(AuthService.STORAGE_KEYS.CODE_VERIFIER)
    localStorage.removeItem(AuthService.STORAGE_KEYS.SIGNIN_EMAIL)
  }
}

export default new AuthService()
