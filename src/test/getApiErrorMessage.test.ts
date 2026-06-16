import { describe, it, expect } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { getApiErrorMessage } from 'src/util/getApiErrorMessage'

// Build an AxiosError the way axios.isAxiosError recognizes it, with a given
// response body — mirrors a real failed request (e.g. a 422 moderation block).
function axiosErrorWith(data: unknown, status = 422): AxiosError {
  const err = new AxiosError('Request failed with status code ' + status)
  err.response = {
    data,
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
  return err
}

describe('getApiErrorMessage', () => {
  it("prefers the server's `error` body over axios's generic message", () => {
    const err = axiosErrorWith({
      error: "This content was flagged by our automated moderation system and can't be published.",
      code: 'CONTENT_BLOCKED',
    })
    expect(getApiErrorMessage(err, 'fallback')).toBe(
      "This content was flagged by our automated moderation system and can't be published."
    )
  })

  it("falls back to the axios message when the body has no `error` (e.g. network)", () => {
    const err = axiosErrorWith(undefined)
    expect(getApiErrorMessage(err, 'fallback')).toBe(
      'Request failed with status code 422'
    )
  })

  it('uses a plain Error message when present', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('returns the fallback for a non-error value', () => {
    expect(getApiErrorMessage('nope', 'fallback')).toBe('fallback')
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback')
  })
})
