import { StylesConfig } from 'react-select'
import styles from 'src/_exports.module.scss'

// Shared react-select styling for the recipe form's Cuisine / Course / Diet
// selectors. Previously three byte-identical copies, each with the same bug:
// the control + selected-option hover used the bare string `'primary'`, which
// is not a valid CSS colour, so the intended orange hover never rendered. Here
// the hover uses the real token (`styles.primary`) and the neutral option-row
// hover is tokenised (`styles.optionHover`) instead of a hard-coded `lightgray`.
export type RecipeSelectOption = { value: string; label: string }

export const recipeSelectStyles: StylesConfig<RecipeSelectOption> = {
  // Lift the open menu above the sticky summary bar (z-index 50) so the
  // Course/Cuisine/Diet dropdowns, which sit just above it, aren't clipped.
  menu: (provided: any) => ({ ...provided, zIndex: 60 }),
  control: (provided: any, state: any) => ({
    ...provided,
    borderColor: state.isFocused ? styles.primary : provided.borderColor,
    borderWidth: '2px',
    backgroundColor: 'none',
    '&:hover': {
      borderColor: styles.primary,
    },
    boxShadow: 'none',
    fontWeight: '500',
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
