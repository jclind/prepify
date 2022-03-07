import React, { useState, useRef } from 'react'
import Select from 'react-select'
import IngredientsItem from './IngredientsItem'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { capitalize } from '../../../util/capitalize'
import { v4 as uuidv4 } from 'uuid'
import './IngredientsList.scss'
import { validateQuantity } from '../../../util/validateIngredientQuantityStr'

const options = [
  { value: null, label: 'None' },
  { value: 'cup', label: 'cup' },
  { value: 'teaspoon', label: 'teaspoon' },
  { value: 'tablespoon', label: 'tablespoon' },
  { value: 'bunch', label: 'bunch' },
  { value: 'cake', label: 'cake' },
  { value: 'dash', label: 'dash' },
  { value: 'drop', label: 'drop' },
  { value: 'gallon', label: 'gallon' },
  { value: 'gram', label: 'gram' },
  { value: 'litre', label: 'litre' },
  { value: 'milliliter', label: 'milliliter' },
  { value: 'ounce', label: 'ounce' },
  { value: 'packet', label: 'packet' },
  { value: 'piece', label: 'piece' },
  { value: 'pinch', label: 'pinch' },
  { value: 'pint', label: 'pint' },
  { value: 'pound', label: 'pound' },
  { value: 'quart', label: 'quart' },
  { value: 'shot', label: 'shot' },
  { value: 'splash', label: 'splash' },
]

const IngredientList = ({
  recipeIngredients,
  instructionListName,
  setRecipeIngredients,
  updateRecipeIngredients,
  updateListName,
  index,
  isMultipleLists,
  removeList,
}) => {
  const [listTitle, setListTitle] = useState('')

  const [quantity, setQuantity] = useState('')
  const [measurement, setMeasurement] = useState(options[0])
  const [name, setName] = useState('')

  const [error, setError] = useState(false)

  const quantityRef = useRef()

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      background: '#eeeeee',
      borderColor: '#9e9e9e',
      minHeight: '47px',
      height: '47px',
      width: '100%',
      minWidth: '160px',
      boxShadow: state.isFocused ? null : null,
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: 'hsl(0, 0%, 0%)',
      paddingBottom: '3px',
    }),
    menu: (provided, state) => ({
      ...provided,
      zIndex: '11',
    }),

    valueContainer: (provided, state) => ({
      ...provided,
      height: '47px',
      padding: '0 6px',
    }),

    input: (provided, state) => ({
      ...provided,
      margin: '0px',
    }),
    indicatorSeparator: state => ({
      display: 'none',
    }),
    indicatorsContainer: (provided, state) => ({
      ...provided,
      height: '47px',
    }),
  }

  const handleAddIngredient = e => {
    e.preventDefault()
    setError('')

    if (!name) return setError('Please fill out ingredient name')

    // If a quantity was given test if it is a valid value
    if (quantity) {
      const validationRes = validateQuantity(quantity)
      if (validationRes.err) {
        return setError(validationRes.err)
      }
    }

    const ingredientData = {
      quantity,
      id: uuidv4(),
      measurement,
      name: capitalize(name),
    }
    setRecipeIngredients(ingredientData, index)

    quantityRef.current.focus()
    setName('')
    setMeasurement(options[0])
    setQuantity('')
  }
  const deleteIngredient = id => {
    const tempIngredientIndex = recipeIngredients.findIndex(
      item => item.id === id
    )

    const ingredientData = [
      ...recipeIngredients.slice(0, tempIngredientIndex),
      ...recipeIngredients.slice(tempIngredientIndex + 1),
    ]
    updateRecipeIngredients(ingredientData, index)
  }
  const updateIngredient = (updatedItem, id) => {
    setError('')

    const tempIngredientIndex = recipeIngredients.findIndex(
      item => item.id === id
    )

    if (
      updatedItem.quantity !== recipeIngredients[tempIngredientIndex].quantity
    ) {
      if (updatedItem.quantity) {
        const validationRes = validateQuantity(updatedItem.quantity)
        if (validationRes.err) {
          return setError(validationRes.err)
        }
      }
    }

    const ingredientData = [
      ...recipeIngredients.slice(0, tempIngredientIndex),
      { ...updatedItem },
      ...recipeIngredients.slice(tempIngredientIndex + 1),
    ]
    updateRecipeIngredients(ingredientData, index)

    // setRecipeIngredients()
    return true
  }

  // Draggable functions
  const handleOnDragEnd = param => {
    const srcIdx = param.source.index
    const desIdx = param.destination.index

    if (desIdx !== null) {
      const tempIngredientsList = JSON.parse(JSON.stringify(recipeIngredients))

      const movedIngredient = tempIngredientsList.splice(srcIdx, 1)[0]

      tempIngredientsList.splice(desIdx, 0, movedIngredient)

      setRecipeIngredients(tempIngredientsList)
    }
  }

  const updateInstructionListName = e => {
    const val = e.target.value
    setListTitle(val)
    updateListName(val, index)
  }

  return (
    <div className='ingredients-list'>
      {isMultipleLists && (
        <div className='list-title'>
          {listTitle ? `${listTitle}:` : `${instructionListName}:`}
        </div>
      )}
      {isMultipleLists && (
        <button
          type='button'
          className='remove-list-btn btn'
          onClick={() => removeList(index)}
        >
          Remove List
        </button>
      )}
      {error && <div className='error'>{error}</div>}
      {isMultipleLists && (
        <input
          className='list-title-input'
          placeholder={`Enter Title For List ${index + 1}`}
          value={listTitle}
          onChange={updateInstructionListName}
        />
      )}
      <div className='inputs'>
        <input
          type='text'
          className='ingredient-quantity'
          value={quantity}
          onChange={e => {
            setQuantity(e.target.value)
          }}
          placeholder={'Qty'}
          ref={quantityRef}
        />
        <div className='measurement-container'>
          <div className='label'>Measurement</div>
          <Select
            options={options}
            styles={customStyles}
            className='measurement-select'
            value={measurement}
            onChange={e => setMeasurement(e)}
          />
        </div>
        <input
          type='text'
          className='ingredient-name'
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={'Name, instructions'}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddIngredient(e)
            }
          }}
        />
        <button
          className='add-ingredient-btn btn'
          type='button'
          onClick={handleAddIngredient}
        >
          Add
        </button>
      </div>
      <DragDropContext onDragEnd={param => handleOnDragEnd(param)}>
        <Droppable droppableId='droppable-1'>
          {(provided, _) => (
            <div
              className='list'
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {recipeIngredients &&
                recipeIngredients.map((ingredient, idx) => {
                  return (
                    <IngredientsItem
                      ingredient={ingredient}
                      deleteItem={deleteIngredient}
                      updateItem={updateIngredient}
                      key={ingredient.id}
                      index={idx}
                      options={options}
                    />
                  )
                })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}

export default IngredientList
