import parser from 'body-parser'

export const ParserRawMiddleware = parser.raw({})

export const ParserJSONMiddleware = parser.json({})

export const ParserURLEncodedMiddleware = parser.urlencoded({})
