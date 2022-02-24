import React, { useEffect } from 'react'
import { useDropzone } from 'react-dropzone'

const RecipeImage = ({ recipeImage, setRecipeImage }) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/png, image/gif, image/jpeg',

    onDrop: acceptedFiles => {
      const tempFiles = acceptedFiles.map(file =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
      setRecipeImage(tempFiles[0])
    },
    maxFiles: 1,
  })

  useEffect(() => {
    if (recipeImage) {
      URL.revokeObjectURL(recipeImage.preview)
    }
  }, [recipeImage])

  return (
    <div className='recipe-image'>
      <div className='recipe-form-input'>
        <div className='label-title'>Recipe Image *</div>
        <div {...getRootProps({ className: 'recipe-image-dropzone' })}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop your recipe image here, or click to select image</p>
        </div>
      </div>
      {recipeImage && (
        <>
          <div className='recipe-image-container' key={recipeImage.name}>
            <img
              src={recipeImage.preview}
              alt={recipeImage.name}
              className='recipe-image'
            />
          </div>
        </>
      )}
    </div>
  )
}

export default RecipeImage
