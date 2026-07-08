/**
 * Unit coverage for the pure helpers in scripts/migrateRecipeImagesToUid.js.
 *
 * The copy/repoint I/O is verified by a controlled dev run (inject → migrate →
 * assert → cleanup, see docs/IMAGE_PIPELINE.md). These tests pin the two pure,
 * highest-risk correctness surfaces the runtime pass can't exhaustively cover:
 *   - `classifyImage` — deciding flat (migrate) vs already-uid-scoped (skip) vs
 *     non-Storage/external (skip) vs an unrecognised path, from a stored URL.
 *   - `downloadUrl` — producing a Firebase download URL whose whole path is
 *     percent-encoded (slashes → %2F) so `parseStorageUrl` round-trips it.
 */
const { classifyImage, downloadUrl } = require('../scripts/migrateRecipeImagesToUid')
const { parseStorageUrl } = require('../util/firebaseStorage')

const fbUrl = (bucket, encodedPath, token = 'tok') =>
  `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${token}`

describe('classifyImage', () => {
  test('flat recipeImages/{filename} → migrate (surfaces bucket + decoded path)', () => {
    const url = fbUrl('prepify-9b974.appspot.com', 'recipeImages%2FPad-Thai-Web-7.jpg')
    expect(classifyImage(url)).toEqual({
      kind: 'flat',
      bucket: 'prepify-9b974.appspot.com',
      path: 'recipeImages/Pad-Thai-Web-7.jpg',
    })
  })

  test('extensionless flat filename still classifies as flat', () => {
    const url = fbUrl('prepify-9b974.appspot.com', 'recipeImages%2F1677604011276')
    expect(classifyImage(url)).toMatchObject({ kind: 'flat', path: 'recipeImages/1677604011276' })
  })

  test('already uid-scoped recipeImages/{uid}/{uuid} → migrated (skip)', () => {
    const url = fbUrl('prepify-dev-58579.firebasestorage.app', 'recipeImages%2Fz52CJ9ugDta2mEOrSZltOu11f7J3%2Faa3f822c-a879-4362-898d-fcee7de7999f')
    expect(classifyImage(url)).toEqual({ kind: 'migrated' })
  })

  test('empty / missing recipeImage → not-storage', () => {
    expect(classifyImage('')).toEqual({ kind: 'not-storage' })
    expect(classifyImage(null)).toEqual({ kind: 'not-storage' })
    expect(classifyImage(undefined)).toEqual({ kind: 'not-storage' })
  })

  test('external (non-Firebase) URL → not-storage', () => {
    expect(classifyImage('https://images.example.com/photo.jpg')).toEqual({ kind: 'not-storage' })
  })

  test('a Storage object outside recipeImages/ → unexpected (never touched)', () => {
    const url = fbUrl('prepify-dev-58579.firebasestorage.app', 'profilePhotos%2Fsome-uid')
    expect(classifyImage(url)).toEqual({ kind: 'unexpected', path: 'profilePhotos/some-uid' })
  })
})

describe('downloadUrl', () => {
  test('percent-encodes the whole object path so parseStorageUrl round-trips', () => {
    const bucket = 'prepify-dev-58579.firebasestorage.app'
    const objectPath = 'recipeImages/uid-123/9f3c1d2e-abcd'
    const url = downloadUrl(bucket, objectPath, 'tok-42')

    expect(url).toContain('/o/recipeImages%2Fuid-123%2F9f3c1d2e-abcd?')
    expect(url).toContain('alt=media')
    expect(url).toContain('token=tok-42')
    // The migration writes this URL; the migration also reads paths back with
    // parseStorageUrl — they must agree, or a re-run would misclassify.
    expect(parseStorageUrl(url)).toEqual({ bucket, path: objectPath })
  })
})
