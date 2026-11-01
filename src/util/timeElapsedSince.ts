const ago = (n: number, unit: string): string =>
  `${n} ${unit}${n === 1 ? '' : 's'} ago`

export const timeElapsedSince = (date: Date | string): string => {
  const now = new Date()
  const oldDate = new Date(date)
  if (isNaN(oldDate.getTime())) return 'invalid date'
  const elapsedMs = now.getTime() - oldDate.getTime()
  const elapsedSec = elapsedMs / 1000
  const elapsedMin = elapsedSec / 60
  const elapsedHr = elapsedMin / 60
  const elapsedDay = elapsedHr / 24
  const elapsedWeek = elapsedDay / 7
  const elapsedMonth = elapsedDay / 30
  const elapsedYear = elapsedDay / 365

  if (elapsedMin < 1) {
    return ago(Math.floor(elapsedSec), 'second')
  } else if (elapsedHr < 1) {
    return ago(Math.floor(elapsedMin), 'minute')
  } else if (elapsedDay < 1) {
    return ago(Math.floor(elapsedHr), 'hour')
  } else if (elapsedWeek < 1) {
    return ago(Math.floor(elapsedDay), 'day')
  } else if (elapsedMonth < 1) {
    return ago(Math.floor(elapsedWeek), 'week')
  } else if (elapsedYear < 1) {
    return ago(Math.floor(elapsedMonth), 'month')
  } else {
    return ago(Math.floor(elapsedYear), 'year')
  }
}
