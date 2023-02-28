const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const formatDate = (d: string, short: boolean): string => {
  const date = Number.isNaN(d) ? new Date(d) : new Date(Number(d))
  let day = date.getDate()
  let month = monthNames[date.getMonth()]
  let year = date.getFullYear()

  if (short) {
    month = month.substring(0, 3)
  }
  return `${month} ${day}, ${year}`
}
