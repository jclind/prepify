// Inverse of hrMinToMin: splits a stored minute total back into the
// { hours, minutes } shape TimeInput expects. Returns null for 0/null so the
// field renders empty (matching an unset prep/cook time).
export const minToHrMin = (
  totalMin: number | null
): { hours: number; minutes: number } | null => {
  if (!totalMin) return null
  return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 }
}
