import { sha256 } from "js-sha256"

/**
 * Generate a random code verifier (43-128 characters, base64url)
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

/**
 * Generate code challenge from verifier (SHA256 hash, base64url)
 */
export function generateCodeChallenge(verifier: string): string {
  const hashed = sha256(verifier)
  const bytes = new Uint8Array(hashed.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
  return base64UrlEncode(bytes)
}

/**
 * Base64 URL encode (RFC 4648 §5)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}
