const admin = require('firebase-admin')

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
    await admin.storage().bucket(parsed.bucket).file(parsed.path).delete()
    return true
  } catch (err) {
    console.error('Failed to delete recipe image from storage:', err.message)
    return false
  }
}

module.exports = { parseStorageUrl, deleteRecipeImage }
