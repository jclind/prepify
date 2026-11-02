import { describe, expect, it } from 'vitest'
import { resolveApiBaseUrl } from 'src/api/http-common'

describe('resolveApiBaseUrl', () => {
  it('uses the page origin for `same-origin`', () => {
    expect(resolveApiBaseUrl('same-origin', 'https://prepifymeals.com')).toBe(
      'https://prepifymeals.com'
    )
  })

  it('keeps an explicit API origin', () => {
    expect(
      resolveApiBaseUrl('https://api.prepifymeals.com', 'https://prepifymeals.com')
    ).toBe('https://api.prepifymeals.com')
  })

  it('falls back to the local server when unset or empty', () => {
    expect(resolveApiBaseUrl(undefined, 'http://localhost:3000')).toBe('http://localhost:4000')
    expect(resolveApiBaseUrl('', 'http://localhost:3000')).toBe('http://localhost:4000')
  })
})
