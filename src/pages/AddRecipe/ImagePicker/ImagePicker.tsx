import React, { useState, useRef } from 'react'
import { AiOutlineClose } from 'react-icons/ai'
import toast from 'react-hot-toast'
import './ImagePicker.scss'

const MAX_IMAGE_SIZE = 5000 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ImagePickerProps {
  image: File | undefined
  setImage: React.Dispatch<React.SetStateAction<File | undefined>>
}

const ImagePicker: React.FC<ImagePickerProps> = ({ image, setImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | undefined>()

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
        toast.error('Image cannot be more than 5MB in size.')
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
      >
        <button className='remove-btn option-btn' onClick={removeImage}>
          <AiOutlineClose className='icon' />
        </button>
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
