import React, { useState, useEffect, FC } from 'react'
import Select, { SingleValue } from 'react-select'
import { useNavigate, useLocation } from 'react-router-dom'
import './RecipeFilters.scss'

type RecipeFiltersProps = {
  options?: { value: string; label: string }[]
  selectVal: string
  setSelectVal: (val: string) => void
  selectedTags: string[]
  setSelectedTags: (val: string[]) => void
}

const RecipeFilters: FC<RecipeFiltersProps> = ({
  options,
  selectVal,
  setSelectVal,
  selectedTags,
  setSelectedTags,
}) => {
  const [tags, setTags] = useState([])
  const selectOptions = options || [
    { value: 'popular', label: 'Popular' },
    { value: 'new', label: 'Date: Newest' },
    { value: 'old', label: 'Date: Oldest' },
    { value: 'cheapest', label: 'Price: Cheapest' },
    { value: 'expensive', label: 'Price: Most Expensive' },
    { value: 'shortest', label: 'Time: Shortest' },
    { value: 'longest', label: 'Time: Longest' },
  ]

  const navigate = useNavigate()
  const location = useLocation()
  let urlParams = new URLSearchParams(location.search)
  const order = urlParams.get('order')
  const defaultSelectValue =
    selectOptions.find(el => el.value === order) || selectOptions[0]

  useEffect(() => {
    setSelectVal(selectOptions[0].value)
    // getTopTags(5).then(tags => {
    //   setTags(tags.data)
    // })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectChange = (
    e: SingleValue<{
      value: string
      label: string
    }>
  ) => {
    if (e) {
      const value = e.value
      console.log(value)
      setSelectVal(value)
      urlParams.set('order', value)
      navigate(`/recipes?${urlParams}`)
    }
  }

  const handleTagClick = (text: string) => {
    if (selectedTags.includes(text)) {
      const idx = selectedTags.indexOf(text)
      return setSelectedTags([
        ...selectedTags.slice(0, idx),
        ...selectedTags.slice(idx + 1, selectedTags.length),
      ])
    }

    return setSelectedTags([...selectedTags, text])
  }

  return (
    <div className='filters'>
      <Select
        options={selectOptions}
        isSearchable={false}
        isClearable={false}
        className='select'
        onChange={handleSelectChange}
        defaultValue={defaultSelectValue}
      />
      {/* <div className='tags'>
        {tags.map(tag => {
          return (
            <div
              className={
                selectedTags.includes(tag.text)
                  ? 'tag-selected tag'
                  : 'tag-not-selected tag'
              }
              key={tag.text}
              onClick={() => handleTagClick(tag.text)}
            >
              {tag.text} <span className='count'>({tag.count})</span>
            </div>
          )
        })}
      </div> */}
    </div>
  )
}

export default RecipeFilters
