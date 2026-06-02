import React from 'react'
import { render, screen } from '@testing-library/react'
import RecipeFormInput from 'src/pages/AddRecipe/RecipeFormInput'

describe('RecipeFormInput — accessibility props', () => {
  it('sets aria-invalid and aria-describedby when invalid', () => {
    render(
      <RecipeFormInput
        placeholder='Title'
        val=''
        setVal={() => {}}
        invalid
        describedBy='error-title'
      />
    )
    const input = screen.getByPlaceholderText('Title')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'error-title')
  })

  it('omits aria-invalid / aria-describedby when valid', () => {
    render(<RecipeFormInput placeholder='Title' val='' setVal={() => {}} />)
    const input = screen.getByPlaceholderText('Title')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})
