import React, { useState, useRef } from 'react'
import { AiOutlineEdit, AiOutlineClose } from 'react-icons/ai'
import './ImagePicker.scss'

interface ImagePickerProps {
  image: File | undefined
  setImage: React.Dispatch<React.SetStateAction<File | undefined>>
}

const ImagePicker: React.FC<ImagePickerProps> = ({ image, setImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | undefined>()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0]

    if (file) {
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
