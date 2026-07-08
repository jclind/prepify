import { StylesConfig } from 'react-select'
import styles from 'src/_exports.module.scss'

// Shared react-select styling for the recipe form's Cuisine / Course / Diet
// selectors. These sit right next to the form's text fields, every one of which
// now routes through the shared FormInput `compact` variant — so the control is
// tuned to match that field exactly (1px `$tertiary-text` border, teal
// `$secondary` focus border + the `@mixin focus-glow` halo, the `$border-radius`
// token, a 40px min-height, and a 1rem text inset) so the whole form reads as one
// design system. The selected-option row keeps the brand-orange fill; the neutral
// option-row hover is tokenised (`styles.optionHover`).
export type RecipeSelectOption = { value: string; label: string }

export const recipeSelectStyles: StylesConfig<RecipeSelectOption> = {
  // Lift the open menu above the sticky summary bar (z-index 50) so the
  // Course/Cuisine/Diet dropdowns, which sit just above it, aren't clipped.
  menu: (provided: any) => ({ ...provided, zIndex: 60 }),
  control: (provided: any, state: any) => ({
    ...provided,
    minHeight: '40px',
    // Match FormInput `compact`: teal focus border + glow, neutral resting
    // border, no orange hover shift (the text fields give no hover feedback).
    borderColor: state.isFocused ? styles.secondary : styles.borderColor,
    borderWidth: '1px',
    borderRadius: styles.borderRadius,
    backgroundColor: 'none',
    '&:hover': {
      borderColor: state.isFocused ? styles.secondary : styles.borderColor,
    },
    boxShadow: state.isFocused ? styles.focusGlow : 'none',
    fontWeight: '500',
  }),
  // Align the text inset with FormInput `compact` (padding: 0 1rem).
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '2px 1rem',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected ? styles.primary : 'transparent',
    color: state.isSelected ? 'white' : 'inherit',
    fontWeight: '500',
    '&:hover': {
      backgroundColor: state.isSelected ? styles.primary : styles.optionHover,
      color: state.isSelected ? 'white' : 'inherit',
    },
  }),
}
