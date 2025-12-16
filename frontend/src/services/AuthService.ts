import { generateCodeChallenge, generateCodeVerifier } from '@/utils/pkce'

const API_BASE = 'http://localhost:40080'

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
        // Generate PKCE challenge
        const codeVerifier = generateCodeVerifier()
        const codeChallenge = generateCodeChallenge(codeVerifier)

        // Store verifier in sessionStorage (needed for step 2)
        sessionStorage.setItem('code_verifier', codeVerifier)
        sessionStorage.setItem('signin_email', email)

        const response = await fetch(`${API_BASE}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, code_challenge: codeChallenge })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Sign-in failed')
        }

        return response.json()
    }

    /**
     * Step 2: Confirm sign-in with 6-digit code (verifies PKCE, returns JWT tokens)
     */
    async signInConfirm(email: string, code: string): Promise<SignInConfirmResponse> {
        const codeVerifier = sessionStorage.getItem('code_verifier')

        if (!codeVerifier) {
            throw new Error('No code verifier found. Please request a new sign-in code.')
        }

        const response = await fetch(`${API_BASE}/auth/signin/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, code, code_verifier: codeVerifier })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Verification failed')
        }

        const data: SignInConfirmResponse = await response.json()

        // Store tokens securely
        localStorage.setItem('access_token', data.accessToken)
        localStorage.setItem('refresh_token', data.refreshToken)
        localStorage.setItem('user', JSON.stringify(data.user))

        // Clean up session storage
        sessionStorage.removeItem('code_verifier')
        sessionStorage.removeItem('signin_email')

        return data
    }

    /**
     * Sign out (invalidate tokens on server, clear local storage)
     */
    async signOut(): Promise<void> {
        const token = localStorage.getItem('access_token')

        if (token) {
            try {
                await fetch(`${API_BASE}/auth/signout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include'
                })
            } catch (error) {
                console.error('Sign-out request failed:', error)
            }
        }

        // Clear local storage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const user = localStorage.getItem('user')
        return user ? JSON.parse(user) : null
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!localStorage.getItem('access_token')
    }

    /**
     * Get access token for API requests
     */
    getAccessToken(): string | null {
        return localStorage.getItem('access_token')
    }
}

export default new AuthService()

