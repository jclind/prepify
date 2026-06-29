import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormInput from 'src/Components/Form/FormInput'

const renderInput = (props: Partial<React.ComponentProps<typeof FormInput>> = {}) =>
  render(
    <FormInput
      icon={<span data-testid='icon' />}
      type='password'
      name='password'
      label='Password'
      val='secret'
      setVal={() => {}}
      placeholder='Your password'
      {...props}
    />
  )

describe('FormInput password toggle', () => {
  it('starts hidden and flips type + aria-label when toggled', () => {
    renderInput()
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    const toggle = screen.getByRole('button', { name: 'Show password' })
    fireEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(
      screen.getByRole('button', { name: 'Hide password' })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
  })

  it('renders no toggle for non-password inputs', () => {
    renderInput({ type: 'email', name: 'email', label: 'Email' })
    expect(
      screen.queryByRole('button', { name: /password/i })
    ).not.toBeInTheDocument()
    expect((screen.getByLabelText('Email') as HTMLInputElement).type).toBe(
      'email'
    )
  })

  it('uses the label text for the field and reflects typing', () => {
    const setVal = vi.fn()
    renderInput({ setVal, val: '' })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'hunter2' },
    })
    expect(setVal).toHaveBeenCalledWith('hunter2')
  })
})

describe('FormInput — accessibility props', () => {
  it('sets aria-invalid and aria-describedby when invalid', () => {
    render(
      <FormInput
        size='compact'
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
    render(
      <FormInput size='compact' placeholder='Title' val='' setVal={() => {}} />
    )
    const input = screen.getByPlaceholderText('Title')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input).not.toHaveAttribute('aria-describedby')
  })
})

describe('FormInput — characterLimit', () => {
  it('drops the change once the value would exceed the limit', () => {
    const setVal = vi.fn()
    render(
      <FormInput
        size='compact'
        placeholder='Title'
        val='abc'
        setVal={setVal}
        characterLimit={3}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'abcd' },
    })
    expect(setVal).not.toHaveBeenCalled()
  })

  it('accepts input up to the limit', () => {
    const setVal = vi.fn()
    render(
      <FormInput
        size='compact'
        placeholder='Title'
        val='ab'
        setVal={setVal}
        characterLimit={3}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Title'), {
      target: { value: 'abc' },
    })
    expect(setVal).toHaveBeenCalledWith('abc')
  })
})
