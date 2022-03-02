import React, { useState, useEffect } from 'react'
import './RecipeTags.scss'
import { AiOutlineClose } from 'react-icons/ai'
import { useRecipe } from '../../../context/RecipeContext'

const RecipeTags = ({ tags, setTags }) => {
  const [tagsInputVal, setTagsInputVal] = useState('')
  const [isTagsInputValid, setIsTagsInputValid] = useState(false)

  const [searchResults, setSearchResults] = useState([])

  const [error, setError] = useState('')

  const { validateTag, searchTags } = useRecipe()

  const handleAddTag = e => {
    if (!isTagsInputValid) {
      return setError('Tag not valid, please try a different tag')
    }

    if (tagsInputVal.trim()) {
      e.preventDefault()

      // If the currently added tag already exists in the tags array, set error. Can't have two of the same tags on one recipe
      if (tags.filter(tag => tag.text === tagsInputVal).length !== 0) {
        return setError(tagsInputVal + ' is already in use!')
      }

      setTags([...tags, { text: tagsInputVal }])
      setTagsInputVal('')
    }
  }
  const handleDeleteTag = tagText => {
    setTags(tags.filter(tag => tag.text !== tagText))
  }

  // If enter or comma are pressed, add current tag
  const handleKeyPress = e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(e)
    }
  }
  const handleClickSearchResult = result => {
    setTags([...tags, result])
    setTagsInputVal('')
  }

  // Search through tags collection to show matching tags to user input
  useEffect(() => {
    setError('')

    setIsTagsInputValid(validateTag(tagsInputVal, tags))

    setSearchResults([])
    if (tagsInputVal.length >= 3) {
      searchTags(tagsInputVal, tags).then(res => {
        setSearchResults(res.data)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsInputVal])

  return (
    <label className='recipe-tags-input'>
      <div className='label-title'>Recipe Tags</div>
      {error && <div className='error'>{error}</div>}
      <div className='tags-list'>
        {tags.length > 0 &&
          tags.map(tag => {
            return (
              <div className='tag' key={tag.text}>
                <AiOutlineClose
                  className='delete-tag'
                  onClick={() => handleDeleteTag(tag.text)}
                />
                {tag.text}
              </div>
            )
          })}
      </div>
      <div className='input-container'>
        <input
          type={'string'}
          placeholder={'Tag your recipe'}
          value={tagsInputVal}
          onChange={e => setTagsInputVal(e.target.value.toLowerCase())}
          onKeyPress={handleKeyPress}
        />
        {tagsInputVal && isTagsInputValid ? (
          <button
            type='button'
            className='add-tag-btn btn'
            onClick={handleAddTag}
          >
            Add
          </button>
        ) : null}

        {searchResults.length > 0 && (
          <div className='search-results'>
            <div className='search-results-title'>Popular Tags</div>
            {searchResults.map(result => {
              return (
                <div
                  className='result'
                  key={result.text}
                  onClick={() => handleClickSearchResult(result)}
                >
                  {result.text}
                  <span className='count'>({result.count})</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </label>
  )
}

export default RecipeTags
