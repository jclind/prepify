/**
 * auditMeta — shared actor labelling + action metadata for the Audit log and the
 * Analytics "recent actions" feed. Asserts the behaviour we want: automated
 * (system-actor) rows read "Automod" rather than the misleading admin fallback,
 * and the two automod actions have display metadata (a missing key would be a
 * compile error, but this pins the labels callers render).
 */

import { describe, it, expect } from 'vitest'
import { formatAuditActor, isSelfAction, ACTION_META } from 'src/pages/Admin/auditMeta'

describe('formatAuditActor', () => {
  it('labels a system-actor row "Automod"', () => {
    expect(formatAuditActor({ actorType: 'system', actorUsername: null })).toBe('Automod')
  })

  it('ignores any username on a system row (never shows a handle for Automod)', () => {
    expect(formatAuditActor({ actorType: 'system', actorUsername: 'system:automod' })).toBe(
      'Automod'
    )
  })

  it('shows a human admin by @handle', () => {
    expect(formatAuditActor({ actorType: 'admin', actorUsername: 'mod' })).toBe('@mod')
  })

  it('falls back to "An admin" for a human row with no resolved username', () => {
    expect(formatAuditActor({ actorType: 'admin', actorUsername: null })).toBe('An admin')
  })

  it('shows a self-service actor by their captured @handle', () => {
    expect(formatAuditActor({ actorType: 'user', actorUsername: 'jess' })).toBe('@jess')
  })

  it('falls back to "A user" (never "An admin") for a self-service row with no handle', () => {
    expect(formatAuditActor({ actorType: 'user', actorUsername: null })).toBe('A user')
  })
})

describe('isSelfAction', () => {
  it('is true for a self-service row where the actor is its own target', () => {
    expect(isSelfAction({ actorType: 'user', actorUid: 'u1', targetId: 'u1' })).toBe(true)
  })

  it('is false for a user-actor row whose target is something else', () => {
    // Guards the latent case: a future self-service action with a distinct
    // target must still render its target rather than be suppressed.
    expect(isSelfAction({ actorType: 'user', actorUid: 'u1', targetId: 'r9' })).toBe(false)
  })

  it('is false for admin and system rows', () => {
    expect(isSelfAction({ actorType: 'admin', actorUid: 'u1', targetId: 'u1' })).toBe(false)
    expect(isSelfAction({ actorType: 'system', actorUid: 'u1', targetId: 'u1' })).toBe(false)
    expect(isSelfAction({ actorType: undefined, actorUid: 'u1', targetId: 'u1' })).toBe(false)
  })
})

describe('ACTION_META — user.delete', () => {
  it('reads as a self-described action ("deleted their account")', () => {
    // Rendered as "{actor} deleted their account" with the target suppressed,
    // so the label must not need a trailing target to make sense.
    expect(ACTION_META['user.delete']).toEqual({
      label: 'deleted their account',
      tone: 'danger',
    })
  })
})

describe('ACTION_META — automated-moderation actions', () => {
  it('has display metadata for the automod actions', () => {
    expect(ACTION_META['recipe.autohold']).toEqual({ label: 'auto-held recipe', tone: 'warn' })
    expect(ACTION_META['content.blocked']).toEqual({ label: 'blocked content from', tone: 'warn' })
  })
})
