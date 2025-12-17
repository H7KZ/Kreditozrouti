import parser from 'body-parser'

/**
 * Middleware that parses incoming request bodies into a Buffer.
 * Useful for handling binary data streams.
 */
export const ParserRawMiddleware = parser.raw({})

/**
 * Middleware that parses incoming request bodies with JSON payloads.
 * Populates `req.body` with the parsed JSON object.
 */
export const ParserJSONMiddleware = parser.json({})

/**
 * Middleware that parses incoming request bodies with URL-encoded payloads.
 * Populates `req.body` with key-value pairs from form submissions.
 */
export const ParserURLEncodedMiddleware = parser.urlencoded({})
