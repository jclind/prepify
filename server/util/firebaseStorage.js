const { getStorage } = require('firebase-admin/storage')

// Firebase Storage download URLs look like:
//   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded-path>?alt=media&token=...
// Pull out the bucket and the decoded object path so the file can be deleted
// server-side. Returns null for anything that isn't a recognizable URL (e.g.
// empty string, an already-relative path, or a non-Firebase URL).
function parseStorageUrl(url) {
  if (typeof url !== 'string') return null
  const match = url.match(/\/b\/([^/]+)\/o\/([^?]+)/)
  if (!match) return null
  return { bucket: match[1], path: decodeURIComponent(match[2]) }
}

// Best-effort deletion of a recipe's image from Firebase Storage. Never throws:
// an orphaned image is undesirable but must not fail (or roll back) the recipe
// deletion it accompanies. Returns true only when a file was actually deleted.
async function deleteRecipeImage(url) {
  const parsed = parseStorageUrl(url)
  if (!parsed) return false
  try {
    await getStorage().bucket(parsed.bucket).file(parsed.path).delete()
    return true
  } catch (err) {
    console.error('Failed to delete recipe image from storage:', err.message)
    return false
  }
}

// Best-effort deletion of a user's profile photo, which (unlike recipe images)
// we only know by its Storage PATH — `profilePhotos/{uid}`, written by the
// client's AuthContext.updateProfileData — not by a download URL. Never throws,
// same posture as deleteRecipeImage: an orphaned avatar must not fail (or roll
// back) the account deletion it accompanies. Returns true only when a file was
// actually deleted.
//
// The Admin SDK isn't initialized with a default storageBucket, so we can only
// name the bucket explicitly from FIREBASE_STORAGE_BUCKET. When it's unset we
// SKIP the cleanup (return false) rather than calling the argless
// getStorage().bucket(), which throws "Bucket name not specified" — that throw
// was previously swallowed, logging a spurious error on every account deletion
// and orphaning the avatar. Skipping matches the `.env.example` contract
// ("leave empty to skip profile-photo cleanup — an orphaned avatar is tolerated").
async function deleteProfilePhoto(uid) {
  if (!uid || typeof uid !== 'string') return false
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) return false
  const path = `profilePhotos/${uid}`
  try {
    await getStorage().bucket(bucketName).file(path).delete()
    return true
  } catch (err) {
    console.error('Failed to delete profile photo from storage:', err.message)
    return false
  }
}

module.exports = { parseStorageUrl, deleteRecipeImage, deleteProfilePhoto }
