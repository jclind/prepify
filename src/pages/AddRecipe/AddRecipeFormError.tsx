import { AlertTriangleIcon } from 'src/Components/icons'
import React, { FC } from 'react'

type AddRecipeFormErrorProps = {
  error: string | undefined
  // Stable id so the related input can point to this message via
  // aria-describedby, tying the error to the field for screen readers.
  id?: string
}

const AddRecipeFormError: FC<AddRecipeFormErrorProps> = ({ error, id }) => {
  return (
    <div className='error form-error' id={id} role='alert'>
      <AlertTriangleIcon aria-hidden='true' />
      {error}
    </div>
  )
}

export default AddRecipeFormError
