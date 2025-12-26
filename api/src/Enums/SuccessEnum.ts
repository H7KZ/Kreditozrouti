/**
 * Defines specific numeric identifiers for successful operations.
 * Codes typically map to HTTP status groups (e.g., 200xxx, 201xxx).
 */
enum SuccessCodeEnum {
    /** General success status. */
    OK = 200_000,

    /** Indicates the verification code was successfully sent to the user. */
    SIGN_IN_CODE_SENT = 201_001,
    /** Indicates the user was successfully authenticated. */
    SIGNED_IN = 201_002,
    /** Indicates the user session was successfully terminated. */
    SIGNED_OUT = 201_003
}

export { SuccessCodeEnum }
