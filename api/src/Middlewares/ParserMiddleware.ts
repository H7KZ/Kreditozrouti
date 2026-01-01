import parser from 'body-parser'

/**
 * Parses incoming request bodies into a Buffer.
 * Used for handling binary data streams.
 */
export const ParserRawMiddleware = parser.raw({})

/**
 * Parses incoming request bodies as JSON.
 * Populates `req.body` with the parsed object.
 */
export const ParserJSONMiddleware = parser.json({})

/**
 * Parses incoming request bodies with URL-encoded payloads.
 * Populates `req.body` with form data.
 */
export const ParserURLEncodedMiddleware = parser.urlencoded({ extended: true })
