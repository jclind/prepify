// Short-form a count for tight UI (badges, metric tiles): e.g. 98300 → "98k",
// 1284000 → "1.3M". Values under 1,000 render as-is.
export const formatCompactCount = (n: number | undefined): string => {
  const v = n ?? 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) {
    // Whole-k from 10k up. Guard the boundary so values like 999,500 round to
    // "1.0M" rather than an awkward "1000k".
    const k = Math.round(v / 1000)
    return k >= 1000 ? `${(v / 1_000_000).toFixed(1)}M` : `${k}k`
  }
  if (v >= 1_000) {
    // About 9,951 to 9,999 round to "10.0k"; show them as the "10k" the next band uses.
    const k = (v / 1000).toFixed(1)
    return k === '10.0' ? '10k' : `${k}k`
  }
  return String(v)
}
