/**
 * Categorizes the origin or nature of an application error.
 */
enum ErrorTypeEnum {
    /** Default category for unclassified or unexpected errors. */
    UNKNOWN = 'Unknown',

    /** General logical validation failures. */
    VALIDATION = 'Validation',
    /** Errors originating from Zod schema validation failures. */
    ZOD_VALIDATION = 'ZodValidation',
    /** Errors related to identity verification and login. */
    AUTHENTICATION = 'Authentication',
    /** Errors related to permission access control. */
    AUTHORIZATION = 'Authorization',
    /** Errors originating from database operations. */
    DATABASE = 'Database',
    /** Errors resulting from interactions with third-party APIs or services. */
    EXTERNAL_SERVICE = 'ExternalService'
}

/**
 * Defines specific numeric identifiers for error conditions.
 * Codes typically map to HTTP status groups (e.g., 401xxx, 500xxx).
 */
enum ErrorCodeEnum {
    /** Default zero-value code. */
    UNKNOWN = 0,

    /** General unauthorized access error. */
    UNAUTHORIZED = 401_000,
    /** Error indicating invalid login credentials were provided. */
    INCORRECT_CREDENTIALS = 401_001,
    /** Error indicating a technical failure during the sign-in process. */
    SIGN_IN_FAILED = 401_002,

    /** General validation failure error code. */
    VALIDATION = 403_000,

    /** Error indicating a requested resource does not exist. */
    RESOURCE_NOT_FOUND = 404_000,

    /** General internal server error. */
    INTERNAL_SERVER_ERROR = 500_000,
    /** Error indicating failure to dispatch an email. */
    EMAIL_NOT_SENT = 500_001,
    /** Error indicating a failed database insertion operation. */
    INSERT_FAILED = 500_003
}

export { ErrorTypeEnum, ErrorCodeEnum }
