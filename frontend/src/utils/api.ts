import AuthService from '@/services/AuthService'

const API_BASE = 'http://localhost:40080'

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = AuthService.getAccessToken()

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include',
        headers
    })

    if (response.status === 401) {
        // Token expired or invalid - sign out and redirect to login
        await AuthService.signOut()
        window.location.href = '/login'
        throw new Error('Unauthorized')
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }))
        throw new Error(error.message || 'Request failed')
    }

    return response.json()
}

