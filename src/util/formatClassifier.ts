import { ReportClassifier } from 'types'

// Render an automated-moderation classifier snapshot as a short admin-facing
// string, e.g. "harassment · 60% confidence · medium severity". Shared by the
// Reports queue and the recipe page's admin strip so they read identically.
//
// The numeric score (when present) is embedded in `reason`, e.g.
// 'openai:harassment:0.60' — parse it out rather than show the raw token. No raw
// user content is shown: the only reports filed are medium holds, which are
// openai-only (blocklist hits are always high-blocked, never held), so `reason`
// never carries a matched term.
export const formatClassifier = (c: ReportClassifier): string => {
  const parts: string[] = []
  if (c.category) parts.push(c.category)
  const scoreMatch = c.reason?.match(/:([0-9]*\.?[0-9]+)$/)
  if (scoreMatch) parts.push(`${Math.round(parseFloat(scoreMatch[1]) * 100)}% confidence`)
  if (c.severity) parts.push(`${c.severity} severity`)
  return parts.join(' · ')
}
