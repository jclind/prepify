/**
 * Auth mock strategy
 * ──────────────────
 * vi.mock calls are hoisted above imports by Vitest, so they're in place before
 * any module-level Firebase code executes (e.g. `const auth = getAuth()` in
 * AuthContext.tsx and `initializeApp(...)` in src/client/db.ts).
 *
 * The onAuthStateChanged stub never calls its callback, so AuthProvider stays in
 * `loading: true` and renders only the loading spinner — no page components
 * mount, no API calls fire.
 *
 * App.tsx has no Router; it relies on context from react-router-dom (useLocation
 * in ScrollToTop, useNavigate in AuthProvider). The MemoryRouter wrapper below
 * supplies that context.
 */

import React from 'react'
import { vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from 'src/App'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn().mockReturnValue({}),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn().mockReturnValue({
    onAuthStateChanged: vi.fn().mockReturnValue(() => {}),
    currentUser: null,
  }),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  updateProfile: vi.fn(),
  updateEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() },
  updatePassword: vi.fn(),
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn().mockReturnValue({}),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({}),
}))

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
  })
})
