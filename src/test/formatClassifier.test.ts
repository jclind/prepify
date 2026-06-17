/**
 * formatClassifier — renders an automod classifier snapshot as the short
 * admin-facing string shown in the Reports queue and the recipe admin strip.
 *
 * These assert the SHAPE WE WANT rendered for each real combination of fields,
 * not just the happy path: the score is parsed out of `reason` (never shown
 * raw), and each segment drops out cleanly when its field is absent.
 */

import { describe, it, expect } from 'vitest'
import { formatClassifier } from 'src/util/formatClassifier'
import { ReportClassifier } from 'types'

const classifier = (over: Partial<ReportClassifier> = {}): ReportClassifier => ({
  severity: 'medium',
  category: 'harassment',
  reason: 'openai:harassment:0.60',
  source: 'openai',
  ...over,
})

describe('formatClassifier', () => {
  it('renders category · confidence · severity for a full classifier', () => {
    expect(formatClassifier(classifier())).toBe(
      'harassment · 60% confidence · medium severity'
    )
  })

  it('renders confidence from the numeric score field when present', () => {
    expect(
      formatClassifier(classifier({ score: 0.6, reason: null }))
    ).toBe('harassment · 60% confidence · medium severity')
  })

  it('prefers the numeric score over a (legacy) score embedded in reason', () => {
    // score wins even if reason still carries an older trailing number.
    expect(
      formatClassifier(classifier({ score: 0.42, reason: 'openai:harassment:0.99' }))
    ).toContain('42% confidence')
  })

  it('omits the confidence segment when score is null and reason carries none', () => {
    const out = formatClassifier(classifier({ score: null, reason: 'vision:adult:VERY_LIKELY' }))
    expect(out).not.toMatch(/confidence/)
    expect(out).toBe('harassment · medium severity')
  })

  it('falls back to the legacy reason-embedded score when score is absent', () => {
    expect(formatClassifier(classifier({ reason: 'openai:violence:0.07' }))).toContain(
      '7% confidence'
    )
    expect(formatClassifier(classifier({ reason: 'openai:hate:1' }))).toContain(
      '100% confidence'
    )
  })

  it('omits the confidence segment when reason carries no trailing score', () => {
    // A reason without a trailing number (the regex anchors on end-of-string).
    const out = formatClassifier(classifier({ reason: 'vision:adult:VERY_LIKELY' }))
    expect(out).not.toMatch(/confidence/)
    expect(out).toBe('harassment · medium severity')
  })

  it('omits the confidence segment when reason is null', () => {
    const out = formatClassifier(classifier({ reason: null }))
    expect(out).not.toMatch(/confidence/)
    expect(out).toBe('harassment · medium severity')
  })

  it('drops the category segment when category is null', () => {
    expect(formatClassifier(classifier({ category: null }))).toBe(
      '60% confidence · medium severity'
    )
  })

  it('drops the severity segment when severity is falsy', () => {
    expect(
      formatClassifier(classifier({ severity: null as unknown as ReportClassifier['severity'] }))
    ).toBe('harassment · 60% confidence')
  })

  // EDGE: every renderable segment absent (malformed/partial snapshot). Falls back
  // to a readable placeholder instead of '' so the call sites never show a dangling
  // "Auto-flagged: " / "Auto-held … — ." label.
  it('falls back to a placeholder when nothing renderable is present', () => {
    expect(
      formatClassifier({
        severity: null as unknown as ReportClassifier['severity'],
        category: null,
        reason: null,
        source: 'openai',
      })
    ).toBe('details unavailable')
  })
})
