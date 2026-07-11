export const formatRating = (avg: number, count: number) => {
  if (avg === 0 || count === 0 || Number.isNaN(avg)) {
    return 'No Ratings'
  }
  const roundedNumber = Math.round(Number(avg) * 10) / 10
  return roundedNumber.toFixed(1)
}
