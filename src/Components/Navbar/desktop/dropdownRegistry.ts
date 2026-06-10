/** Account-dropdown designs — a second switchable dimension, independent of the
 *  nav variant. Any nav variant can pair with any dropdown style. */
export type DropdownVariant = {
  id: string
  label: string
}

export const DROPDOWN_VARIANTS: DropdownVariant[] = [
  { id: 'classic', label: 'Classic Card' }, // "Signed in as", Account/Help, logout row
  { id: 'profile', label: 'Profile Card' }, // avatar + name + email header, outlined logout button
  { id: 'compact', label: 'Compact List' }, // tight icon list, no identity header
  { id: 'rich', label: 'Rich Sections' }, // profile header + grouped sections (adds Settings)
]

export const DEFAULT_DROPDOWN_ID = DROPDOWN_VARIANTS[0].id

export const getDropdown = (id: string | null | undefined): DropdownVariant =>
  DROPDOWN_VARIANTS.find(d => d.id === id) ?? DROPDOWN_VARIANTS[0]
