export const formatRating = (tot: number, count: number) => {
  if (tot === 0 || count === 0) {
    return 'No Ratings'
  }
  const roundedNumber = Math.round((Number(tot) / Number(count)) * 10) / 10

  return roundedNumber.toFixed(1)
}
