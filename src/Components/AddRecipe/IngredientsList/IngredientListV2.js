import React, { useState, useRef } from 'react'
import Select from 'react-select'
import IngredientsItem from './IngredientsItem'
import { DragDropContext, Droppable } from 'react-beautiful-dnd'
import { capitalize } from '../../../util/capitalize'
import { v4 as uuidv4, validate } from 'uuid'
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

const IngredientListV2 = ({ recipeIngredients, setRecipeIngredients }) => {
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
      width: '200px',
      boxShadow: state.isFocused ? null : null,
    }),
    singleValue: (provided, state) => ({
      ...provided,
      color: 'hsl(0, 0%, 0%)',
      paddingBottom: '3px',
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

    setRecipeIngredients(prevState => [
      ...prevState,
      { quantity, id: uuidv4(), measurement, name: capitalize(name) },
    ])
    quantityRef.current.focus()
    setName('')
    setMeasurement(options[0])
    setQuantity('')
  }
  const deleteIngredient = id => {
    setRecipeIngredients(recipeIngredients.filter(item => item.id !== id))
  }
  const updateIngredient = (updatedItem, id) => {
    setError('')

    const tempIngredientIndex = recipeIngredients.findIndex(
      item => item.id === id
    )
    console.log(
      updatedItem.quantity,
      recipeIngredients[tempIngredientIndex].quantity
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

    setRecipeIngredients([
      ...recipeIngredients.slice(0, tempIngredientIndex),
      { ...updatedItem },
      ...recipeIngredients.slice(tempIngredientIndex + 1),
    ])
    return true
  }

  // Draggable functions
  const handleOnDragEnd = param => {
    const srcIdx = param.source.index
    const desIdx = param.destination.index

    if (desIdx !== null) {
      console.log(srcIdx, desIdx)

      const tempIngredientsList = JSON.parse(JSON.stringify(recipeIngredients))

      const movedIngredient = tempIngredientsList.splice(srcIdx, 1)[0]

      tempIngredientsList.splice(desIdx, 0, movedIngredient)

      setRecipeIngredients(tempIngredientsList)
    }
  }

  return (
    <div className='ingredients-list'>
      <label className='label-title'>Ingredients *</label>
      {error && <div className='error'>{error}</div>}
      <div className='inputs'>
        <input
          type='text'
          className='ingredient-quantity'
          value={quantity}
          onChange={e => {
            // const val = e.target.value.trim()
            // if (val && !isNaN(val) && val.toString().includes('.'))
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
          onClick={handleAddIngredient}
        >
          Add Ingredient
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

export default IngredientListV2
