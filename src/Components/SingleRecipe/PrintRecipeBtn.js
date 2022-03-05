import React, { useState } from 'react'

import { BsPrinter, BsFillPrinterFill } from 'react-icons/bs'
import { useAlert } from 'react-alert'

const PrintRecipeBtn = () => {
  const [isHovered, setIsHovered] = useState(false)

  const alert = useAlert()

  return (
    <div className='print-recipe'>
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
    </div>
  )
}

export default PrintRecipeBtn
