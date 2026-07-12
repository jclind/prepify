import { CloseIcon } from 'src/Components/icons'
import React, { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { IMAGE_TOO_LARGE } from 'src/util/toastMessages'
import './ImagePicker.scss'

const MAX_IMAGE_SIZE = 5000 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ImagePickerProps {
  image: File | undefined
  setImage: React.Dispatch<React.SetStateAction<File | undefined>>
  // Edit mode: the recipe's existing image URL, shown as the initial preview so
  // the field isn't empty when no new file has been picked yet.
  initialPreviewUrl?: string
  // Edit mode: fires when the user clears the image, so the parent can drop the
  // existing-image URL it tracks for validation.
  onRemove?: () => void
  // Accessibility: id(s) of the text describing the picker (the section's error
  // message and/or the draft-image hint), announced with the dropzone control.
  describedBy?: string
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  image,
  setImage,
  initialPreviewUrl,
  onRemove,
  describedBy,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | undefined>(
    initialPreviewUrl
  )

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]

    if (file) {
      // Validate before doing any work: reject non-image types and oversized
      // files so we never upload junk to storage. Clear the input on rejection
      // so the same corrected file can be re-picked.
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error('Please choose a JPEG, PNG, or WebP image.')
        resetInput()
        return
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(IMAGE_TOO_LARGE)
        resetInput()
        return
      }

      setImage(file)

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onloadend = () => {
        const img = new Image()
        img.src = reader.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          let width = img.width
          let height = img.height
          let x = 0
          let y = 0

          if (width > height) {
            x = (width - height) / 2
            width = height
          } else {
            y = (height - width) / 2
            height = width
          }

          canvas.width = width
          canvas.height = height

          if (ctx) {
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
            setImagePreview(canvas.toDataURL())
          }
        }
      }
    }
  }

  const handleClick = () => {
    if (fileInputRef.current && !imagePreview) {
      fileInputRef.current.click()
    }
  }
  const removeImage = () => {
    setImage(undefined)
    setImagePreview(undefined)
    resetInput()
    onRemove?.()
  }

  return (
    <div className='image-picker-container'>
      <div
        className={
          imagePreview
            ? 'image-picker-box image-picker-box-selected'
            : 'image-picker-box'
        }
        onClick={handleClick}
        // While empty, the dropzone IS the picker control: expose it as a
        // keyboard-operable button (role + tab stop + Enter/Space). Once an
        // image is picked it becomes a static preview container (the Remove
        // button handles interaction), so we don't nest a control in a button.
        role={imagePreview ? undefined : 'button'}
        tabIndex={imagePreview ? undefined : 0}
        aria-label={imagePreview ? undefined : 'Select an image'}
        aria-describedby={imagePreview ? undefined : describedBy}
        onKeyDown={
          imagePreview
            ? undefined
            : e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClick()
                }
              }
        }
      >
        {imagePreview && (
          <button
            type='button'
            className='remove-btn'
            aria-label='Remove image'
            onClick={removeImage}
          >
            <CloseIcon className='icon' />
          </button>
        )}
        <input
          type='file'
          accept='image/*'
          ref={fileInputRef}
          className='image-picker-input'
          onChange={handleFileSelect}
        />
        {imagePreview ? (
          <img
            src={imagePreview}
            alt='Preview'
            className='image-picker-preview'
          />
        ) : (
          <div className='image-picker-text'>Click to select an image</div>
        )}
      </div>
    </div>
  )
}

export default ImagePicker
