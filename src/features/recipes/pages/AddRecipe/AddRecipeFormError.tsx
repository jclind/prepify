import React, { FC } from 'react'
import { AiFillWarning } from 'react-icons/ai'

type AddRecipeFormErrorProps = {
  error: string | undefined
}

const AddRecipeFormError: FC<AddRecipeFormErrorProps> = ({ error }) => {
  return (
    <div className='error form-error'>
      <AiFillWarning />
      {error}
    </div>
  )
}

export default AddRecipeFormError
