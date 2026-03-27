export const timeElapsedSince = (date: Date | string): string => {
  const now = new Date()
  const oldDate = new Date(date)
  if (!oldDate) return 'invalid date'
  const elapsedMs = now.getTime() - oldDate.getTime()
  const elapsedSec = elapsedMs / 1000
  const elapsedMin = elapsedSec / 60
  const elapsedHr = elapsedMin / 60
  const elapsedDay = elapsedHr / 24
  const elapsedWeek = elapsedDay / 7
  const elapsedMonth = elapsedDay / 30
  const elapsedYear = elapsedDay / 365

  if (elapsedMin < 1) {
    return `${Math.floor(elapsedSec)} seconds ago`
  } else if (elapsedHr < 1) {
    return `${Math.floor(elapsedMin)} minutes ago`
  } else if (elapsedDay < 1) {
    return `${Math.floor(elapsedHr)} hours ago`
  } else if (elapsedWeek < 1) {
    return `${Math.floor(elapsedDay)} days ago`
  } else if (elapsedMonth < 1) {
    return `${Math.floor(elapsedWeek)} weeks ago`
  } else if (elapsedYear < 1) {
    return `${Math.floor(elapsedMonth)} months ago`
  } else {
    return `${Math.floor(elapsedYear)} years ago`
  }
}
