/**
 * storage.rules against the Storage emulator (`npm run test:rules`; needs Java
 * and the Firebase CLI, so CI doesn't run it).
 *
 * Review fix 1f (AC-P1, partial): the server moderates a recipe image once, when
 * the recipe that points at it is saved. If the owner could overwrite the object
 * in place afterwards, the approved URL would serve whatever they uploaded next.
 * So under recipeImages/{uid}/ the owner may create a new object but not replace
 * one. Delete stays allowed for the client's failed-submit cleanup.
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteObject, ref, uploadBytes } from 'firebase/storage'

const OWNER = 'owner-uid'
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
const IMAGE = { contentType: 'image/png' }

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-prepify',
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})

beforeEach(() => env.clearStorage())
afterAll(() => env.cleanup())

const ownerStorage = () => env.authenticatedContext(OWNER).storage()

// Put an object in place without going through the rules, as an earlier
// upload would have.
const seed = (path: string) =>
  env.withSecurityRulesDisabled(async ctx => {
    await uploadBytes(ref(ctx.storage(), path), PNG, IMAGE)
  })

describe('recipeImages/{uid}/{imageId}', () => {
  it('lets the owner create a new image', async () => {
    await assertSucceeds(uploadBytes(ref(ownerStorage(), `recipeImages/${OWNER}/new`), PNG, IMAGE))
  })

  it('denies the owner overwriting an existing image', async () => {
    await seed(`recipeImages/${OWNER}/approved`)
    await assertFails(uploadBytes(ref(ownerStorage(), `recipeImages/${OWNER}/approved`), PNG, IMAGE))
  })

  it('still lets the owner delete their image', async () => {
    await seed(`recipeImages/${OWNER}/approved`)
    await assertSucceeds(deleteObject(ref(ownerStorage(), `recipeImages/${OWNER}/approved`)))
  })

  it('denies another user creating under the owner prefix', async () => {
    const other = env.authenticatedContext('other-uid').storage()
    await assertFails(uploadBytes(ref(other, `recipeImages/${OWNER}/x`), PNG, IMAGE))
  })

  it('denies a non-image upload', async () => {
    await assertFails(
      uploadBytes(ref(ownerStorage(), `recipeImages/${OWNER}/x`), PNG, { contentType: 'text/html' })
    )
  })
})

describe('profilePhotos/{uid}', () => {
  // The avatar lives at one fixed path, so replacing it has to keep working.
  it('lets the owner replace their photo', async () => {
    await seed(`profilePhotos/${OWNER}`)
    await assertSucceeds(uploadBytes(ref(ownerStorage(), `profilePhotos/${OWNER}`), PNG, IMAGE))
  })
})
