const dietLabels: string[] = [
  'VEGETARIAN',
  'GLUTEN_FREE',
  'PEANUT_FREE',
  'KOSHER',
  'VEGAN',
  'LOW_SUGAR',
  'High-Fiber',
  'High-Protein',
  'Low-Carb',
  'Low-Fat',
  'Low-Sodium',
]
const dietLabelsOptions: { label: string; value: string }[] = [
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'GLUTEN_FREE', label: 'Gluten Free' },
  { value: 'PEANUT_FREE', label: 'Peanut Free' },
  { value: 'KOSHER', label: 'Kosher' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'LOW_SUGAR', label: 'Low Sugar' },
  { value: 'High-Fiber', label: 'High Fiber' },
  { value: 'High-Protein', label: 'High Protein' },
  { value: 'Low-Carb', label: 'Low Carb' },
  { value: 'Low-Fat', label: 'Low Fat' },
  { value: 'Low-Sodium', label: 'Low Sodium' },
]

export { dietLabelsOptions }
export default dietLabels
