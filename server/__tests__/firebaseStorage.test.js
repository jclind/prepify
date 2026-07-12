const admin = require('firebase-admin') // auto-mocked
const {
  parseStorageUrl,
  deleteRecipeImage,
  deleteProfilePhoto,
} = require('../util/firebaseStorage')

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

describe('deleteProfilePhoto', () => {
  // Save/restore the env the SUT reads so a real FIREBASE_STORAGE_BUCKET (from a
  // loaded .env) can't leak into these cases and each test controls it explicitly.
  const ORIGINAL_BUCKET = process.env.FIREBASE_STORAGE_BUCKET

  beforeEach(() => {
    admin.__deleteFile.mockClear()
    admin.__storageInstance.bucket.mockClear()
  })
  afterEach(() => {
    if (ORIGINAL_BUCKET === undefined) delete process.env.FIREBASE_STORAGE_BUCKET
    else process.env.FIREBASE_STORAGE_BUCKET = ORIGINAL_BUCKET
  })

  it('deletes profilePhotos/{uid} from the named bucket and returns true', async () => {
    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
    await expect(deleteProfilePhoto('test-uid')).resolves.toBe(true)
    // Bucket named explicitly (Admin has no default bucket), path is by uid.
    expect(admin.__storageInstance.bucket).toHaveBeenCalledWith('test-bucket')
    const results = admin.__storageInstance.bucket.mock.results
    const fileMock = results[results.length - 1].value.file
    expect(fileMock).toHaveBeenCalledWith('profilePhotos/test-uid')
    expect(admin.__deleteFile).toHaveBeenCalledTimes(1)
  })

  it('SKIPS cleanup (returns false, no storage call) when FIREBASE_STORAGE_BUCKET is unset', async () => {
    // The N7 fix: with the env unset, we must NOT call the argless
    // getStorage().bucket() (which throws "Bucket name not specified" in prod);
    // we skip per the `.env.example` "leave empty to skip" contract.
    delete process.env.FIREBASE_STORAGE_BUCKET
    await expect(deleteProfilePhoto('test-uid')).resolves.toBe(false)
    expect(admin.__storageInstance.bucket).not.toHaveBeenCalled()
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('SKIPS cleanup when FIREBASE_STORAGE_BUCKET is the empty string', async () => {
    process.env.FIREBASE_STORAGE_BUCKET = ''
    await expect(deleteProfilePhoto('test-uid')).resolves.toBe(false)
    expect(admin.__storageInstance.bucket).not.toHaveBeenCalled()
  })

  it('returns false without touching storage for a missing/invalid uid', async () => {
    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
    await expect(deleteProfilePhoto('')).resolves.toBe(false)
    await expect(deleteProfilePhoto(null)).resolves.toBe(false)
    await expect(deleteProfilePhoto(undefined)).resolves.toBe(false)
    expect(admin.__storageInstance.bucket).not.toHaveBeenCalled()
  })

  it('swallows storage errors and returns false', async () => {
    process.env.FIREBASE_STORAGE_BUCKET = 'test-bucket'
    admin.__deleteFile.mockRejectedValueOnce(new Error('boom'))
    await expect(deleteProfilePhoto('test-uid')).resolves.toBe(false)
  })
})
