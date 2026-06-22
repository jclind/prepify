declare namespace Cypress {
  interface Chainable {
    login(claims?: Record<string, unknown>): Chainable<void>
  }
}

// Test-only sign-in bridge attached by src/client/db.ts when running under
// Cypress, so a spec can sign in with a minted custom token.
interface Window {
  __cy_signIn__: (token: string) => Promise<unknown>
}
