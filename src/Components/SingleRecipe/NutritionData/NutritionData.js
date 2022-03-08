import React, { useState } from 'react'
import { Collapse } from 'react-collapse'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'
import './NutritionData.scss'

const NutritionData = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false)
  console.log(data)
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
              <div className='calories'>Calories</div>
            </div>
            <div className='nutrition-column calories amount align-bottom text-right'>
              {data.calories}
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
              {Math.round(tNutr.FAT.quantity)}g
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.FAT.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Saturated Fat {Math.round(tNutr.FASAT.quantity)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.FASAT.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                <i>Trans</i> Fat {Math.round(tNutr.FATRN.quantity)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Cholesterol</span>{' '}
              {Math.round(tNutr.CHOLE.quantity)}mg
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.CHOLE.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Sodium</span>{' '}
              {Math.round(tNutr.NA.quantity)}mg
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.NA.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Total Carbohydrate</span>{' '}
              {Math.round(tNutr.CHOCDF.quantity)}g
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.CHOCDF.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Dietary Fiber {Math.round(tNutr.FIBTG.quantity)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'>
              {Math.round(tDay.FIBTG.quantity)}%
            </div>
          </div>
          <div className='nutrition-row'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                Total Sugars {Math.round(tNutr.SUGAR.quantity)}g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-t-sm border-b-lg'>
            <div className='nutrition-column'>
              <span className='text-bold'>Protein</span>{' '}
              {Math.round(tNutr.PROCNT.quantity)}g
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Vitamin D {Math.round(tNutr.VITD.quantity)}mcg
            </div>
            <div className='nutrition-column text-right'>
              {Math.round(tDay.VITD.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Calcium {Math.round(tNutr.CA.quantity)}mg
            </div>
            <div className='nutrition-column text-right'>
              {Math.round(tDay.CA.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              Iron {Math.round(tNutr.FE.quantity)}mg
            </div>
            <div className='nutrition-column text-right'>
              {Math.round(tDay.FE.quantity)}%
            </div>
          </div>
          <div className='nutrition-row border-b-md'>
            <div className='nutrition-column'>
              Potassium {Math.round(tNutr.K.quantity)}mg
            </div>
            <div className='nutrition-column text-right'>
              {Math.round(tDay.K.quantity)}%
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
