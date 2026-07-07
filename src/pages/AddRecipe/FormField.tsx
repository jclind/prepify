import React, { FC, ReactNode } from 'react'
import SectionHeader from 'src/pages/AddRecipe/SectionHeader'
import AddRecipeFormError from 'src/pages/AddRecipe/AddRecipeFormError'

type FormFieldProps = {
  // Section-specific wrapper class (e.g. 'title', 'image-picker'); the shared
  // 'input-field' class is always appended so layout/spacing stays uniform.
  className: string
  label: string
  required?: boolean
  // When set, the field's error message is rendered (as an announced alert)
  // between the header and the control, linked to the input via `errorId`.
  error?: string
  errorId?: string
  children: ReactNode
}

// One create-recipe form row: an orange section header + an optional inline
// error + the field's control. Collapses the header/error/wrapper boilerplate
// that every field in AddRecipe repeated verbatim; markup is identical to the
// former inline blocks so CSS and the field tests are unaffected.
const FormField: FC<FormFieldProps> = ({
  className,
  label,
  required = false,
  error,
  errorId,
  children,
}) => (
  <div className={`${className} input-field`}>
    <SectionHeader label={label} required={required} />
    {error && <AddRecipeFormError error={error} id={errorId} />}
    {children}
  </div>
)

export default FormField
