import React, { useState } from 'react'
import { Collapse } from 'react-collapse'
import { MdKeyboardArrowUp, MdKeyboardArrowDown } from 'react-icons/md'
import './NutritionData.scss'

const NutritionData = data => {
  const [isOpen, setIsOpen] = useState(false)
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
            <div className='servings'>8 servings per container</div>
            <div className='nutrition-row'>
              <div className='nutrition-column text-md text-bold'>
                Serving size
              </div>
              <div className='nutrition-column text-md text-bold text-right'>
                2/3 cup (55g)
              </div>
            </div>
          </header>
          <div className='nutrition-row border-b-md'>
            <div className='nutrition-column text-bold'>
              <div className='text-sm'>Amount per serving</div>
              <div className='calories'>Calories</div>
            </div>
            <div className='nutrition-column calories amount align-bottom text-right'>
              230
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column text-right text-bold text-sm'>
              % Daily Value *
            </div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Total Fat</span> 8g
            </div>
            <div className='nutrition-column text-bold text-right'>10%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>Saturated Fat 1g</span>
            </div>
            <div className='nutrition-column text-bold text-right'>5%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>
                <i>Trans</i> Fat 0g
              </span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Cholesterol</span> 0mg
            </div>
            <div className='nutrition-column text-bold text-right'>0%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Sodium</span> 160mg
            </div>
            <div className='nutrition-column text-bold text-right'>7%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-bold'>Total Carbohydrate</span> 37g
            </div>
            <div className='nutrition-column text-bold text-right'>13%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>
              <span className='text-indent'>Dietary Fiber 4g</span>
            </div>
            <div className='nutrition-column text-bold text-right'>14%</div>
          </div>
          <div className='nutrition-row'>
            <div className='nutrition-column'>
              <span className='text-indent'>Total Sugars 12g</span>
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row text-indent-md border-t-sm'>
            <div className='nutrition-column'>Includes 10g Added Sugars</div>
            <div className='nutrition-column text-bold text-right'>20%</div>
          </div>
          <div className='nutrition-row border-t-sm border-b-lg'>
            <div className='nutrition-column'>
              <span className='text-bold'>Protein</span> 3g
            </div>
            <div className='nutrition-column text-bold text-right'></div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>Vitamin D 2mcg</div>
            <div className='nutrition-column text-right'>10%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>Calcium 260mg</div>
            <div className='nutrition-column text-right'>20%</div>
          </div>
          <div className='nutrition-row border-b'>
            <div className='nutrition-column'>Iron 8mg</div>
            <div className='nutrition-column text-right'>45%</div>
          </div>
          <div className='nutrition-row border-b-md'>
            <div className='nutrition-column'>Potassium 235mg</div>
            <div className='nutrition-column text-right'>6%</div>
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
