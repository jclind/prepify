import React, { useState } from 'react'
import ReactToPrint from 'react-to-print'

import { BsPrinter, BsFillPrinterFill } from 'react-icons/bs'
import { useAlert } from 'react-alert'

const PrintRecipeBtn = ({ printedRef }) => {
  const [isHovered, setIsHovered] = useState(false)

  const alert = useAlert()

  return (
    <div className='print-recipe'>
      <ReactToPrint
        trigger={() => (
          <button
            className='print-recipe-btn btn disabled'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => {
              // alert.show("Sorry, this function isn't available yet in beta.", {
              //   timeout: 10000,
              //   type: 'info',
              // })
              window.print()
            }}
          >
            {isHovered ? (
              <BsFillPrinterFill className='icon' />
            ) : (
              <BsPrinter className='icon' />
            )}{' '}
            Print
            <div className='disabled-overlay'></div>
          </button>
        )}
        content={() => printedRef.current}
      />
    </div>
  )
}

export default PrintRecipeBtn
