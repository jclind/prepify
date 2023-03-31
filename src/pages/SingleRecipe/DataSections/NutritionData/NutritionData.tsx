import React, { useState } from 'react'
import { Collapse } from 'react-collapse'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'
import { NutritionDataType } from 'types'
import './NutritionData.scss'

const getQuantity = (num: number, servings: number) => {
  if (!num) {
    return null
  }
  return Math.round(num / servings)
}

type NutritionDataProps = {
  data: NutritionDataType
  servings: number
}

const NutritionData = ({ data, servings }: NutritionDataProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const tNutr = data.totalNutrients
  const tDay = data.totalDaily
  return (
    <div className='recipe-nutrition-data'>
      <button
        className='open-collapse-btn btn'
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className='text'>Nutrition Data</div>
        {isOpen ? (
          <MdKeyboardArrowUp className='icon' />
        ) : (
          <MdKeyboardArrowDown className='icon' />
        )}
      </button>
      <Collapse isOpened={isOpen}>
        <section className='nutrition-label'>
          <header className='nutrition-header border-b-lg'>
            <h1 className='nutrition-facts border-b'>Nutrition Facts</h1>
          </header>
          <div className='nutrition-row border-b-md'>
            <div className='nutrition-column text-bold'>
              <div className='text-sm'>Amount per serving</div>
              <div className='calories'>Calories</div>
            </div>
            <div className='nutrition-column calories amount align-bottom text-right'>
              {getQuantity(data.calories, servings)}
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column text-right text-bold text-sm'>
              % Daily Value *
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Total Fat</span>{' '}
              {getQuantity(tNutr.FAT.quantity, servings)}g
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.FAT.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Saturated Fat {getQuantity(tNutr.FASAT.quantity, servings)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.FASAT.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                <i>Trans</i> Fat{' '}
                {tNutr.FATRN && getQuantity(tNutr.FATRN.quantity, servings)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Cholesterol</span>{' '}
              {getQuantity(tNutr.CHOLE.quantity, servings)}mg
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.CHOLE.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Sodium</span>{' '}
              {getQuantity(tNutr.NA.quantity, servings)}mg
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.NA.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Total Carbohydrate</span>{' '}
              {getQuantity(tNutr.CHOCDF.quantity, servings)}g
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.CHOCDF.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Dietary Fiber {getQuantity(tNutr.FIBTG.quantity, servings)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'>
              {getQuantity(tDay.FIBTG.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Total Sugars {getQuantity(tNutr.SUGAR.quantity, servings)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-t-sm border-b-lg'>
            <div className='nutrition-column'>
              <span className='text-bold'>Protein</span>{' '}
              {getQuantity(tNutr.PROCNT.quantity, servings)}g
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Vitamin D {getQuantity(tNutr.VITD.quantity, servings)}mcg
            </div>
            <div className='nutrition-column text-right'>
              {getQuantity(tDay.VITD.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Calcium {getQuantity(tNutr.CA.quantity, servings)}mg
            </div>
            <div className='nutrition-column text-right'>
              {getQuantity(tDay.CA.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Iron {getQuantity(tNutr.FE.quantity, servings)}mg
            </div>
            <div className='nutrition-column text-right'>
              {getQuantity(tDay.FE.quantity, servings)}%
            </div>
          </div>
          <div className='nutrition-row border-b-md'>
            <div className='nutrition-column'>
              Potassium {getQuantity(tNutr.K.quantity, servings)}mg
            </div>
            <div className='nutrition-column text-right'>
              {getQuantity(tDay.K.quantity, servings)}%
            </div>
          </div>
          <footer className='nutrition-footer'>
            <div className='asteric'>*</div>
            <div className='footnote'>
              The % Daily Value (DV) tells you how much a nutrient in a serving
              of food contributes to a daily diet. 2,000 calories a day is used
              for general nutrition advice.
            </div>
          </footer>
        </section>
      </Collapse>
    </div>
  )
}

export default NutritionData
