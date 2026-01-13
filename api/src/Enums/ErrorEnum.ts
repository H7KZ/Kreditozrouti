/**
 * Categories for the origin or nature of an application error.
 */
enum ErrorTypeEnum {
	UNKNOWN = 'Unknown',
	// VALIDATION = 'Validation',
	ZOD_VALIDATION = 'ZodValidation',
	// AUTHENTICATION = 'Authentication',
	AUTHORIZATION = 'Authorization'
	// DATABASE = 'Database',
	// EXTERNAL_SERVICE = 'ExternalService'
}

/**
 * Numeric identifiers for specific error conditions.
 * Mapped broadly to HTTP status groups (e.g., 401xxx, 500xxx).
 */
enum ErrorCodeEnum {
	UNKNOWN = 0,

	// Authentication (401)
	UNAUTHORIZED = 401_000,

	// Authorization/Validation (403/400)
	VALIDATION = 403_000,

	// Resources (404)
	// RESOURCE_NOT_FOUND = 404_000,

	// Server/Internal (500)
	INTERNAL_SERVER_ERROR = 500_000,
	EMAIL_NOT_SENT = 500_001
}

export { ErrorTypeEnum, ErrorCodeEnum }
