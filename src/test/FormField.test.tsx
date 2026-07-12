import React from 'react'
import { render, screen } from '@testing-library/react'
import FormField from 'src/pages/AddRecipe/FormField'

// W2 a11y wiring: each create-recipe row is a labelled group — the orange
// SectionHeader gets a stable id and the wrapper points at it, so the label's
// governance over the row's control(s) is programmatic, not just visual. In
// error, the group also references the alert, which covers multi-control
// children (the ingredient/instruction list containers) that no single input
// can own the message for.
describe('FormField group semantics', () => {
  it('exposes a group labelled by its section header', () => {
    render(
      <FormField className='ingredients' label='Ingredients' required>
        <input aria-label='child control' />
      </FormField>
    )
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-labelledby', 'section-ingredients')
    const header = screen.getByRole('heading', { name: /ingredients/i })
    expect(header).toHaveAttribute('id', 'section-ingredients')
    expect(group).not.toHaveAttribute('aria-describedby')
  })

  it('references the error alert from the group while in error', () => {
    render(
      <FormField
        className='instructions'
        label='Instructions'
        required
        error='At least one instruction is required.'
        errorId='error-instructions'
      >
        <input aria-label='child control' />
      </FormField>
    )
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-describedby', 'error-instructions')
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'error-instructions')
  })
})
