// Prices are stored in cents; render as a dollar string e.g. 1234 -> "$12.34".
export const formatPrice = (cents: number): string =>
  `$${(cents / 100).toFixed(2)}`
