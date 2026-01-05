/**
 * Interface representing a standard MySQL/MariaDB error object
 * returned by drivers like mysql2 (used internally by Kysely).
 */
export interface DatabaseError extends Error {
    code?: string
    errno?: number
}