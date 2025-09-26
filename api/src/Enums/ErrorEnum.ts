enum ErrorTypeEnum {
    Unknown = 'Unknown',

    Validation = 'Validation',
    ZodValidation = 'ZodValidation',
    Authentication = 'Authentication'
}

enum ErrorCodeEnum {
    Unknown = 0,

    Unauthorized = 401_000,
    IncorrectCredentials = 401_001,
    DifferentOAuthProvider = 401_002,
    InvalidEmail = 401_003,
    InvalidOrExpiredCode = 401_004,

    Validation = 403_000,

    InternalServerError = 500_000,
    CreateUserFailed = 500_001,
    EmailNotSent = 500_002
}

export { ErrorTypeEnum, ErrorCodeEnum }
