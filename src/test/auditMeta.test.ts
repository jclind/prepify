/**
 * auditMeta — shared actor labelling + action metadata for the Audit log and the
 * Analytics "recent actions" feed. Asserts the behaviour we want: automated
 * (system-actor) rows read "Automod" rather than the misleading admin fallback,
 * and the two automod actions have display metadata (a missing key would be a
 * compile error, but this pins the labels callers render).
 */

import { describe, it, expect } from 'vitest'
import { formatAuditActor, ACTION_META } from 'src/pages/Admin/auditMeta'

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
})

describe('ACTION_META — automated-moderation actions', () => {
  it('has display metadata for the automod actions', () => {
    expect(ACTION_META['recipe.autohold']).toEqual({ label: 'auto-held recipe', tone: 'warn' })
    expect(ACTION_META['content.blocked']).toEqual({ label: 'blocked content from', tone: 'warn' })
  })
})
