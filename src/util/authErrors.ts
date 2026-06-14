// Maps raw Firebase Auth error codes to human-readable, non-leaky messages.
// Keeps user-facing copy out of the auth flow and avoids surfacing codes like
// `auth/invalid-credential` directly. Returns '' for benign cases (e.g. the
// user closing the Google popup) so callers can skip showing an error banner.
export const authErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for help.'
    // Firebase collapses wrong-email / wrong-password into invalid-credential
    // when email-enumeration protection is on; treat them all the same so we
    // never reveal whether an email is registered.
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    // User dismissed the Google popup — not worth an error banner.
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    default:
      return 'Something went wrong. Please try again.'
  }
}
