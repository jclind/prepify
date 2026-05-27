import React from 'react'
import { vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ImagePicker from 'src/pages/AddRecipe/ImagePicker/ImagePicker'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))

vi.mock('react-hot-toast', () => ({
  default: { error: toastError },
  toast: { error: toastError },
}))

const getFileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement

describe('ImagePicker — file validation', () => {
  beforeEach(() => toastError.mockReset())

  it('rejects a non-image file type and does not set the image', () => {
    const setImage = vi.fn()
    const { container } = render(
      <ImagePicker image={undefined} setImage={setImage} />
    )
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })

    expect(toastError).toHaveBeenCalledWith(
      'Please choose a JPEG, PNG, or WebP image.'
    )
    expect(setImage).not.toHaveBeenCalled()
  })

  it('rejects an image larger than 5MB', () => {
    const setImage = vi.fn()
    const { container } = render(
      <ImagePicker image={undefined} setImage={setImage} />
    )
    const file = new File(['x'], 'big.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 5000 * 1024 + 1 })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })

    expect(toastError).toHaveBeenCalledWith('Image cannot be more than 5MB in size.')
    expect(setImage).not.toHaveBeenCalled()
  })

  it('accepts a valid image within the size limit', () => {
    const setImage = vi.fn()
    const { container } = render(
      <ImagePicker image={undefined} setImage={setImage} />
    )
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    fireEvent.change(getFileInput(container), { target: { files: [file] } })

    expect(setImage).toHaveBeenCalledTimes(1)
    expect(toastError).not.toHaveBeenCalled()
  })
})
