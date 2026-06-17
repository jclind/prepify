import { ReportClassifier } from 'types'

// Render an automated-moderation classifier snapshot as a short admin-facing
// string, e.g. "harassment · 60% confidence · medium severity". Shared by the
// Reports queue and the recipe page's admin strip so they read identically.
//
// Confidence comes from the numeric `score` field (0–1). No raw user content is
// shown: the only reports filed are medium holds, which are openai-only
// (blocklist hits are always high-blocked, never held), so `reason` never
// carries a matched term.
export const formatClassifier = (c: ReportClassifier): string => {
  const parts: string[] = []
  if (c.category) parts.push(c.category)
  const score = classifierScore(c)
  if (score !== null) parts.push(`${Math.round(score * 100)}% confidence`)
  if (c.severity) parts.push(`${c.severity} severity`)
  // A classifier with no renderable fields would otherwise return '', which leaves
  // the call sites showing a dangling label ("Auto-flagged: " / "Auto-held … — .").
  // Real medium holds always carry category + severity + score, so this only fires
  // on a malformed/partial snapshot — fall back to a readable placeholder.
  return parts.length ? parts.join(' · ') : 'details unavailable'
}

// Prefer the persisted numeric score; fall back to the score embedded in `reason`
// (e.g. 'openai:harassment:0.60') for legacy reports filed before `score` existed.
const classifierScore = (c: ReportClassifier): number | null => {
  if (typeof c.score === 'number') return c.score
  const match = c.reason?.match(/:([0-9]*\.?[0-9]+)$/)
  return match ? parseFloat(match[1]) : null
}
