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
//
// The row is exposed as a labelled group: the SectionHeader gets a stable id
// (derived from the row's className, which is already unique per field) and the
// wrapper points at it via role='group' + aria-labelledby, so assistive tech
// knows which fields the orange label governs — the visual grouping alone
// carried no programmatic link. When the field is in error, the group also
// carries aria-describedby to the alert, which covers multi-control children
// (the ingredient/instruction list containers) that no single input can
// meaningfully own the message for.
const FormField: FC<FormFieldProps> = ({
  className,
  label,
  required = false,
  error,
  errorId,
  children,
}) => {
  const headerId = `section-${className}`
  return (
    <div
      className={`${className} input-field`}
      role='group'
      aria-labelledby={headerId}
      aria-describedby={error && errorId ? errorId : undefined}
    >
      <SectionHeader label={label} required={required} id={headerId} />
      {error && <AddRecipeFormError error={error} id={errorId} />}
      {children}
    </div>
  )
}

export default FormField
