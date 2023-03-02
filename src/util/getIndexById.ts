export const getIndexById = <T extends { id: string | number }>(
  arr: T[],
  id: T['id']
): number => {
  const index = arr.findIndex(el => el.id === id)
  return index
}
