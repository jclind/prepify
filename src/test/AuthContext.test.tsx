import React, { ReactNode } from 'react'
import { vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// The reauthentication + account-deletion flows in AuthContext are the riskiest
// code in the settings overhaul (silent data loss / account removal), but until
// now were only ever *mocked* by the section tests. These exercise the real
// provider logic with Firebase stubbed out.

import {
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  verifyBeforeUpdateEmail,
  updatePassword,
  updateProfile,
  signOut,
  EmailAuthProvider,
} from 'firebase/auth'
import { uploadBytes, getDownloadURL } from 'firebase/storage'
import AuthAPI from 'src/api/auth'
import AuthProvider, { useAuth } from 'src/context/AuthContext'

// Mutable holder the onAuthStateChanged stub reads, so each test can sign in a
// password-based or Google-based user before rendering.
const h = vi.hoisted(() => ({ authUser: null as any }))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    onAuthStateChanged: (cb: (u: any) => void) => {
      cb(h.authUser)
      return () => {}
    },
    currentUser: h.authUser,
  })),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(undefined),
  verifyBeforeUpdateEmail: vi.fn().mockResolvedValue(undefined),
  reauthenticateWithCredential: vi.fn().mockResolvedValue(undefined),
  reauthenticateWithPopup: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  EmailAuthProvider: { credential: vi.fn().mockReturnValue('fake-cred') },
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn().mockReturnValue({}),
  ref: vi.fn().mockReturnValue('photo-ref'),
  uploadBytes: vi.fn().mockResolvedValue(undefined),
  getDownloadURL: vi.fn().mockResolvedValue('https://cdn/new-photo.png'),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('src/api/auth', () => ({
  default: {
    getUsername: vi.fn().mockResolvedValue('johndoe'),
    setUsername: vi.fn().mockResolvedValue(undefined),
    updatePhoto: vi.fn().mockResolvedValue(undefined),
    updateDisplayName: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    checkUsernameAvailability: vi.fn().mockResolvedValue(true),
  },
}))

const makeUser = (overrides: Record<string, any> = {}) => ({
  uid: 'u1',
  email: 'john@example.com',
  displayName: 'John',
  photoURL: '',
  providerData: [{ providerId: 'password' }],
  reload: vi.fn().mockResolvedValue(undefined),
  getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
  ...overrides,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

// Renders the provider and waits for onAuthStateChanged to settle the user, so
// the context value (which is gated behind `loading`) is available.
const mountAuth = async (user: any) => {
  h.authUser = user
  const { result } = renderHook(() => useAuth(), { wrapper })
  await waitFor(() => expect(result.current).not.toBeNull())
  await waitFor(() => expect(result.current!.user).not.toBeNull())
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(AuthAPI.getUsername as ReturnType<typeof vi.fn>).mockResolvedValue('johndoe')
})

// ─── changePassword ───────────────────────────────────────────────────────────

describe('AuthContext — changePassword', () => {
  it('reauthenticates with the old password before updating to the new one', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.changePassword('oldpass', 'newpass1')
    })

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      'john@example.com',
      'oldpass'
    )
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(
      h.authUser,
      'fake-cred'
    )
    expect(updatePassword).toHaveBeenCalledWith(h.authUser, 'newpass1')
  })
})

// ─── deleteAccount ────────────────────────────────────────────────────────────

describe('AuthContext — deleteAccount (password account)', () => {
  it('throws password-required and never calls the server when no password is given', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await expect(result.current!.deleteAccount()).rejects.toMatchObject({
        code: 'password-required',
      })
    })

    expect(reauthenticateWithCredential).not.toHaveBeenCalled()
    expect(AuthAPI.deleteAccount).not.toHaveBeenCalled()
  })

  it('reauthenticates, deletes server-side, signs out and navigates home', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.deleteAccount('hunter2')
    })

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      'john@example.com',
      'hunter2'
    )
    expect(reauthenticateWithCredential).toHaveBeenCalled()
    expect(AuthAPI.deleteAccount).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalled()
    expect(navigateMock).toHaveBeenCalledWith('/')
  })

  it('does not delete server-side if reauthentication fails', async () => {
    ;(reauthenticateWithCredential as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      Object.assign(new Error('wrong'), { code: 'auth/wrong-password' })
    )
    const result = await mountAuth(makeUser())

    await act(async () => {
      await expect(result.current!.deleteAccount('badpass')).rejects.toThrow()
    })

    expect(AuthAPI.deleteAccount).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })
})

describe('AuthContext — deleteAccount (Google account)', () => {
  const googleUser = () =>
    makeUser({ providerData: [{ providerId: 'google.com' }] })

  it('reauthenticates via popup (not password) then deletes', async () => {
    const result = await mountAuth(googleUser())

    await act(async () => {
      await result.current!.deleteAccount()
    })

    expect(reauthenticateWithPopup).toHaveBeenCalled()
    expect(reauthenticateWithCredential).not.toHaveBeenCalled()
    expect(AuthAPI.deleteAccount).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/')
  })
})

// ─── updateProfileData ────────────────────────────────────────────────────────

describe('AuthContext — updateProfileData', () => {
  it('uploads a new avatar and applies its URL through the moderated server endpoint', async () => {
    const result = await mountAuth(makeUser())
    const imgFile = new File(['x'], 'pic.png', { type: 'image/png' })

    await act(async () => {
      await result.current!.updateProfileData({ imgFile })
    })

    expect(uploadBytes).toHaveBeenCalledWith('photo-ref', imgFile)
    expect(getDownloadURL).toHaveBeenCalled()
    // photoURL is now written SERVER-side (so it can be moderated), not via the
    // client Firebase updateProfile; the local user is reloaded to reflect it.
    expect(AuthAPI.updatePhoto).toHaveBeenCalledWith('https://cdn/new-photo.png')
    expect(h.authUser.reload).toHaveBeenCalled()
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it('clears the avatar through the server endpoint when imgFile is explicitly null', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.updateProfileData({ imgFile: null })
    })

    expect(uploadBytes).not.toHaveBeenCalled()
    expect(AuthAPI.updatePhoto).toHaveBeenCalledWith('')
  })

  it('writes displayName through the server endpoint (moderated) and leaves the photo endpoint untouched', async () => {
    const user = makeUser()
    const result = await mountAuth(user)

    await act(async () => {
      await result.current!.updateProfileData({ displayName: 'Jane' })
    })

    // displayName now goes through the moderated server endpoint, not the client
    // Firebase updateProfile; the local user is reloaded to reflect it.
    expect(AuthAPI.updateDisplayName).toHaveBeenCalledWith('Jane')
    expect(user.reload).toHaveBeenCalled()
    expect(updateProfile).not.toHaveBeenCalled()
    expect(AuthAPI.updatePhoto).not.toHaveBeenCalled()
  })

  it('renames the username only when it differs from the current one', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.updateProfileData({ username: 'newname' })
    })
    expect(AuthAPI.setUsername).toHaveBeenCalledWith('newname')

    ;(AuthAPI.setUsername as ReturnType<typeof vi.fn>).mockClear()
    await act(async () => {
      await result.current!.updateProfileData({ username: 'johndoe' })
    })
    expect(AuthAPI.setUsername).not.toHaveBeenCalled()
  })

  it('throws password-required and skips the email change when no password is given', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await expect(
        result.current!.updateProfileData({ email: 'new@example.com' })
      ).rejects.toMatchObject({ code: 'password-required' })
    })

    expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled()
  })

  it('reauthenticates then sends a verification link to the new email', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.updateProfileData({
        email: 'new@example.com',
        password: 'hunter2',
      })
    })

    expect(reauthenticateWithCredential).toHaveBeenCalled()
    expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(
      h.authUser,
      'new@example.com'
    )
  })

  it('does not touch the email when it is unchanged', async () => {
    const result = await mountAuth(makeUser())

    await act(async () => {
      await result.current!.updateProfileData({ email: 'john@example.com' })
    })

    expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled()
  })
})

// ─── referential stability (the memoization fix) ──────────────────────────────

describe('AuthContext — referential stability', () => {
  it('keeps a stable context value across an incidental re-render', async () => {
    h.authUser = makeUser()
    const { result, rerender } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current!.user).not.toBeNull())

    const first = result.current
    // An incidental re-render of the provider tree (e.g. a parent re-rendering)
    // with no change to auth state.
    act(() => {
      rerender()
    })
    const second = result.current

    // The provider memoizes its value and useCallback's its handlers, so the
    // identity must not change here. Before the fix, `value` was rebuilt every
    // render, forcing every useAuth() consumer to re-render for nothing.
    expect(second).toBe(first)
    expect(second!.logout).toBe(first!.logout)
    expect(second!.deleteAccount).toBe(first!.deleteAccount)
    expect(second!.updateProfileData).toBe(first!.updateProfileData)
  })
})
