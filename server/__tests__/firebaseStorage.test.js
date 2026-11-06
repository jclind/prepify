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
  const OWNER = 'user-abc'
  const ownUrl = (bucket = 'test-bucket') =>
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/recipeImages%2F${OWNER}%2Fphoto-1?alt=media&token=abc`

  beforeEach(() => admin.__deleteFile.mockClear())

  it('deletes an image under the owner\'s recipeImages/{uid}/ prefix and returns true', async () => {
    await expect(deleteRecipeImage(ownUrl(), OWNER)).resolves.toBe(true)
    expect(admin.__deleteFile).toHaveBeenCalledTimes(1)
  })

  it('returns false without calling storage for an unparseable url', async () => {
    await expect(deleteRecipeImage('', OWNER)).resolves.toBe(false)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  // The recipe's image URL is client-supplied, so it can name any object the
  // Admin SDK can reach. None of these belong to OWNER and none may be deleted.
  it.each([
    ['another user\'s recipe image', 'recipeImages%2Fvictim-uid%2Fphoto-1'],
    ['another user\'s avatar', 'profilePhotos%2Fvictim-uid'],
    ['a legacy flat recipe image', 'recipeImages%2Ftuscan.jpg'],
    ['a nested path under the owner prefix', `recipeImages%2F${OWNER}%2Fsub%2Fphoto`],
    ['the owner prefix itself', `recipeImages%2F${OWNER}%2F`],
    ['a uid that only starts with the owner\'s', `recipeImages%2F${OWNER}x%2Fphoto-1`],
  ])('refuses to delete %s', async (_label, encodedPath) => {
    const url = `https://firebasestorage.googleapis.com/v0/b/test-bucket/o/${encodedPath}?alt=media&token=abc`
    await expect(deleteRecipeImage(url, OWNER)).resolves.toBe(false)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('refuses an own-prefix path in a bucket outside this project', async () => {
    await expect(deleteRecipeImage(ownUrl('someone-elses-bucket'), OWNER)).resolves.toBe(false)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('refuses when the owner uid is missing', async () => {
    await expect(deleteRecipeImage(ownUrl(), undefined)).resolves.toBe(false)
    await expect(deleteRecipeImage(ownUrl(), '')).resolves.toBe(false)
    expect(admin.__deleteFile).not.toHaveBeenCalled()
  })

  it('swallows storage errors and returns false', async () => {
    admin.__deleteFile.mockRejectedValueOnce(new Error('boom'))
    await expect(deleteRecipeImage(ownUrl(), OWNER)).resolves.toBe(false)
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
