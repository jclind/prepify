import React, { useState } from 'react'
import ReactToPrint from 'react-to-print'
import { TailSpin } from 'react-loader-spinner'

import { BsPrinter, BsFillPrinterFill } from 'react-icons/bs'

type PrintRecipeBtnProps = {
  printedRef: React.MutableRefObject<HTMLInputElement>
}

const PrintRecipeBtn = ({ printedRef }: PrintRecipeBtnProps) => {
  const [isHovered, setIsHovered] = useState(false)

  const [loading, setLoading] = useState(false)

  return (
    <div className='print-recipe'>
      <ReactToPrint
        trigger={() => (
          <button
            className='print-recipe-btn btn'
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={loading}
          >
            {isHovered ? (
              <BsFillPrinterFill className='icon' />
            ) : (
              <BsPrinter className='icon' />
            )}{' '}
            Print
            {loading && (
              <div className='loading'>
                <TailSpin
                  height='30'
                  width='30'
                  color='#303841'
                  ariaLabel='loading'
                />
              </div>
            )}
          </button>
        )}
        onAfterPrint={() => setLoading(false)}
        onBeforeGetContent={() => setLoading(true)}
        content={() => printedRef.current}
      />
    </div>
  )
}

export default PrintRecipeBtn
