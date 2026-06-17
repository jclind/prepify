import { AuditAction, AuditEntryType } from 'types'

// Display name for the actor of an audit row, shared by the Audit log and the
// Analytics "recent actions" feed so they stay in sync. Automated actions
// (autohold, content.blocked) are credited to the synthetic system actor, whose
// uid never resolves to a username — show "Automod" instead of the misleading
// "An admin" fallback. Human admins show their @handle (or a generic fallback).
// Self-service actions ('user') are the account owner acting on themselves, so
// they must never read as "An admin"; fall back to "A user" if the captured
// handle is missing.
export const formatAuditActor = (
  entry: Pick<AuditEntryType, 'actorType' | 'actorUsername'>
): string => {
  if (entry.actorType === 'system') return 'Automod'
  if (entry.actorUsername) return `@${entry.actorUsername}`
  return entry.actorType === 'user' ? 'A user' : 'An admin'
}

// A self-service row (the user acting on their own account, e.g. account
// deletion) has the actor as its own target, so the trailing target label would
// just repeat the actor's handle — "@user deleted their account @user". Callers
// suppress the target span for these rows.
export const isSelfAction = (
  entry: Pick<AuditEntryType, 'actorType'>
): boolean => entry.actorType === 'user'

// Short human phrasing + a colour tone per audit action, used for the row label
// in both the Audit log and the Analytics "recent actions" feed. Kept here so
// the two views stay in sync. When a new AUDIT_ACTION is added on the server,
// add it here too (TypeScript's Record makes a missing key a compile error).
export const ACTION_META: Record<AuditAction, { label: string; tone: string }> = {
  'recipe.hide': { label: 'hid recipe', tone: 'danger' },
  'recipe.unhide': { label: 'restored recipe', tone: 'good' },
  'recipe.publish': { label: 'published recipe', tone: 'good' },
  'recipe.unpublish': { label: 'unpublished recipe', tone: 'warn' },
  'recipe.feature': { label: 'featured recipe', tone: 'good' },
  'recipe.unfeature': { label: 'unfeatured recipe', tone: 'neutral' },
  'recipe.approve': { label: 'approved held recipe', tone: 'good' },
  'review.takedown': { label: 'took down review by', tone: 'danger' },
  'review.restore': { label: 'restored review by', tone: 'good' },
  'user.suspend': { label: 'suspended', tone: 'warn' },
  'user.ban': { label: 'banned', tone: 'danger' },
  'user.activate': { label: 'reactivated', tone: 'good' },
  'user.delete': { label: 'deleted their account', tone: 'danger' },
  'report.resolve': { label: 'resolved report', tone: 'good' },
  'report.dismiss': { label: 'dismissed report', tone: 'neutral' },
  'bugReport.resolve': { label: 'resolved bug report', tone: 'good' },
  'bugReport.dismiss': { label: 'dismissed bug report', tone: 'neutral' },
  // Automated moderation (system actor). autohold = held a borderline recipe for
  // review; content.blocked = refused a write outright (never persisted, target
  // is the offending user; surface/category live in metadata).
  'recipe.autohold': { label: 'auto-held recipe', tone: 'warn' },
  'content.blocked': { label: 'blocked content from', tone: 'warn' },
}
