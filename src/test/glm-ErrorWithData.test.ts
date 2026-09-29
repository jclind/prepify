import { describe, it, expect } from 'vitest'
import { ErrorWithData } from 'src/util/ErrorWithData'

// ErrorWithData carries a machine-readable code alongside a human message.
// Callers (http-common, api modules) branch on `instanceof ErrorWithData` and
// read `.code`, so both the Error base behaviour and the code field are the
// public contract.
describe('ErrorWithData', () => {
  it('is an Error carrying a machine-readable code and message', () => {
    const err = new ErrorWithData('AUTH/USER_NOT_FOUND', 'No such user')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ErrorWithData)
    expect(err.code).toBe('AUTH/USER_NOT_FOUND')
    expect(err.message).toBe('No such user')
  })

  it('can be thrown and caught by instanceof with its data intact', () => {
    expect(() => {
      throw new ErrorWithData('API/DOWN', 'backend unreachable')
    }).toThrowError(ErrorWithData)
    try {
      throw new ErrorWithData('API/DOWN', 'backend unreachable')
    } catch (e) {
      if (!(e instanceof ErrorWithData)) throw new Error('wrong error type')
      expect(e.code).toBe('API/DOWN')
    }
  })
})
