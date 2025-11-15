enum ErrorTypeEnum {
    UNKNOWN = 'Unknown',

    VALIDATION = 'Validation',
    ZOD_VALIDATION = 'ZodValidation',
    AUTHENTICATION = 'Authentication'
}

enum ErrorCodeEnum {
    UNKNOWN = 0,

    UNAUTHORIZED = 401_000,
    INCORRECT_CREDENTIALS = 401_001,

    VALIDATION = 403_000,

    RESOURCE_NOT_FOUND = 404_000,

    INTERNAL_SERVER_ERROR = 500_000,
    EMAIL_NOT_SENT = 500_001
}

export { ErrorTypeEnum, ErrorCodeEnum }
