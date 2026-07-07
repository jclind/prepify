const admin = require('firebase-admin') // auto-mocked
const { parseStorageUrl, deleteRecipeImage } = require('../util/firebaseStorage')

describe('parseStorageUrl', () => {
  it('extracts bucket and decoded path from a Firebase download URL', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ftuscan.jpg?alt=media&token=abc'
    expect(parseStorageUrl(url)).toEqual({
      bucket: 'test-bucket',
      path: 'recipeImages/tuscan.jpg',
    })
  })

  it('extracts the full nested path for uid-keyed images (I2 re-key)', () => {
    // After I2, uploads land at recipeImages/{uid}/{uuid} — the whole slash-bearing
    // object path is percent-encoded as one URL segment, so decoding it must yield
    // the full nested path (not just the last segment) or server-side
    // deletion/moderation would target the wrong object.
    const url =
      'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Fuser-abc%2F123e4567-e89b-12d3-a456-426614174000?alt=media&token=xyz'
    expect(parseStorageUrl(url)).toEqual({
      bucket: 'test-bucket',
      path: 'recipeImages/user-abc/123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('returns null for empty, non-string, or non-Firebase values', () => {
    expect(parseStorageUrl('')).toBeNull()
    expect(parseStorageUrl(null)).toBeNull()
    expect(parseStorageUrl(undefined)).toBeNull()
    expect(parseStorageUrl('https://example.com/image.jpg')).toBeNull()
  })
})

describe('deleteRecipeImage', () => {
  beforeEach(() => admin.__deleteFile.mockClear())

  it('deletes the parsed file and returns true', async () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ftuscan.jpg?alt=media&token=abc'
    await expect(deleteRecipeImage(url)).resolves.toBe(true)
    expect(admin.__deleteFile).toHaveBeenCalledTimes(1)
  })

  it('returns false without calling storage for an unparseable url', async () => {
    await expect(deleteRecipeImage('')).resolves.toBe(false)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('swallows storage errors and returns false', async () => {
    admin.__deleteFile.mockRejectedValueOnce(new Error('boom'))
    const url =
      'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/recipeImages%2Ftuscan.jpg?alt=media&token=abc'
    await expect(deleteRecipeImage(url)).resolves.toBe(false)
  })
})
