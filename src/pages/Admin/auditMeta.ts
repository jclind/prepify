import { AuditAction } from 'types'

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
  'review.takedown': { label: 'took down review by', tone: 'danger' },
  'review.restore': { label: 'restored review by', tone: 'good' },
  'user.suspend': { label: 'suspended', tone: 'warn' },
  'user.ban': { label: 'banned', tone: 'danger' },
  'user.activate': { label: 'reactivated', tone: 'good' },
  'report.resolve': { label: 'resolved report', tone: 'good' },
  'report.dismiss': { label: 'dismissed report', tone: 'neutral' },
  'bugReport.resolve': { label: 'resolved bug report', tone: 'good' },
  'bugReport.dismiss': { label: 'dismissed bug report', tone: 'neutral' },
}
