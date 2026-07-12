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

export const formatDate = (d: string | number, short: boolean): string => {
  const n = Number(d)
  const date = Number.isNaN(n) ? new Date(d) : new Date(n)
  let day = date.getDate()
  let month = monthNames[date.getMonth()]
  let year = date.getFullYear()

  if (short) {
    month = month.substring(0, 3)
  }
  return `${month} ${day}, ${year}`
}

// `createdAt` is stored as an epoch-ms string (see RecipeAPI.addRecipe), so it
// must be coerced with Number() — `new Date(msString)` yields Invalid Date.
export const formatMonthYear = (iso: string): string => {
  const d = new Date(Number(iso))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en', { month: 'long', year: 'numeric' })
}
