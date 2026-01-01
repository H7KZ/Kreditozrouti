/**
 * Generates a high-entropy cryptographic random string (Code Verifier).
 * Compliant with PKCE standard (128 chars).
 */
export function generateCodeVerifier(): string {
  const length = 64 // 64 bytes * 2 (hex) = 128 chars
  const array = new Uint8Array(length)

  window.crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Generates the Code Challenge from the Verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)

  // Convert buffer to Hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}
