import LoggerJobContext from '@scraper/Context/LoggerJobContext'
import { createRequestHeaders } from '@scraper/Utils/HTTPUtils'
import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface HttpClientOptions {
    /** Context key prefix for logging */
    logPrefix?: string
    /** Custom headers to merge with defaults */
    headers?: Record<string, string>
}

export interface HttpResult<T> {
    success: true
    data: T
    response: AxiosResponse<T>
}

export interface HttpError {
    success: false
    error: Error | AxiosError
    status?: number
    statusText?: string
}

export type HttpResponse<T> = HttpResult<T> | HttpError

/**
 * HTTP client wrapper for InSIS requests.
 * Provides consistent error handling, logging, and header management.
 */
export default class InSISHTTPClientService {
    private readonly headers: Record<string, string>
    private readonly logPrefix: string

    constructor(options: HttpClientOptions = {}) {
        this.headers = { ...createRequestHeaders(), ...options.headers }
        this.logPrefix = options.logPrefix ?? 'http'
    }

    /**
     * Performs a GET request with automatic error handling.
     */
    async get<T = string>(url: string, config?: AxiosRequestConfig): Promise<HttpResponse<T>> {
        try {
            const response = await Axios.get<T>(url, {
                ...config,
                headers: { ...this.headers, ...config?.headers }
            })
            return { success: true, data: response.data, response }
        } catch (error) {
            return this.handleError(error, url)
        }
    }

    /**
     * Performs a POST request with automatic error handling.
     */
    async post<T = string>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<HttpResponse<T>> {
        try {
            const response = await Axios.post<T>(url, data, {
                ...config,
                headers: { ...this.headers, ...config?.headers }
            })
            return { success: true, data: response.data, response }
        } catch (error) {
            return this.handleError(error, url)
        }
    }

    /**
     * Performs a GET request, returning null on failure (for use in batch operations).
     */
    async getSilent<T = string>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T> | null> {
        const result = await this.get<T>(url, config)
        return result.success ? result.response : null
    }

    private handleError(error: unknown, url: string): HttpError {
        if (Axios.isAxiosError(error)) {
            LoggerJobContext.add({
                [`${this.logPrefix}_error`]: error.message,
                [`${this.logPrefix}_status`]: error.response?.status,
                [`${this.logPrefix}_status_text`]: error.response?.statusText,
                [`${this.logPrefix}_url`]: url
            })
            return {
                success: false,
                error,
                status: error.response?.status,
                statusText: error.response?.statusText
            }
        }

        const err = error as Error
        LoggerJobContext.add({
            [`${this.logPrefix}_error`]: err.message,
            [`${this.logPrefix}_url`]: url
        })
        return { success: false, error: err }
    }
}

/**
 * Creates a pre-configured HTTP client for InSIS requests.
 */
export function createInSISClient(logPrefix?: string): InSISHTTPClientService {
    return new InSISHTTPClientService({ logPrefix })
}
