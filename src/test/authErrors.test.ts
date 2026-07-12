import { describe, it, expect } from 'vitest'
import { authErrorMessage } from 'src/util/authErrors'

describe('authErrorMessage', () => {
  it('collapses all credential failures into one non-leaky message', () => {
    const expected = 'Incorrect email or password. Please try again.'
    expect(authErrorMessage('auth/invalid-credential')).toBe(expected)
    expect(authErrorMessage('auth/wrong-password')).toBe(expected)
    // user-not-found must read the same so we never reveal which emails exist.
    expect(authErrorMessage('auth/user-not-found')).toBe(expected)
  })

  it('returns empty string for benign popup dismissals (no banner)', () => {
    expect(authErrorMessage('auth/popup-closed-by-user')).toBe('')
    expect(authErrorMessage('auth/cancelled-popup-request')).toBe('')
  })

  it('maps the common specific cases to friendly copy', () => {
    expect(authErrorMessage('auth/invalid-email')).toMatch(/valid email/i)
    expect(authErrorMessage('auth/email-already-in-use')).toMatch(/already exists/i)
    expect(authErrorMessage('auth/weak-password')).toMatch(/at least 6/i)
    expect(authErrorMessage('auth/too-many-requests')).toMatch(/too many/i)
    expect(authErrorMessage('auth/network-request-failed')).toMatch(/network/i)
  })

  it('falls back to a generic message for unknown codes', () => {
    expect(authErrorMessage('auth/some-future-code')).toBe(
      'Something went wrong. Please try again.'
    )
    expect(authErrorMessage('')).toBe('Something went wrong. Please try again.')
  })
})
