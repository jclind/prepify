export const hrMinToMin = (
  obj: { hours: number; minutes: number } | null
): number => {
  if (!obj) return 0
  return Number(obj.hours) * 60 + Number(obj.minutes)
}
