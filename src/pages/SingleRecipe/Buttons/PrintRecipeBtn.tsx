import React, { FC, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { TailSpin } from 'react-loader-spinner'

import { BsPrinter, BsFillPrinterFill } from 'react-icons/bs'

type PrintRecipeBtnProps = {
  printedRef: React.RefObject<HTMLDivElement | null>
}

const PrintRecipeBtn: FC<PrintRecipeBtnProps> = ({ printedRef }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [loading, setLoading] = useState(false)

  const handlePrint = useReactToPrint({
    contentRef: printedRef as React.RefObject<Element>,
    onBeforePrint: async () => setLoading(true),
    onAfterPrint: () => setLoading(false),
  })

  return (
    <div className='print-recipe'>
      <button
        className='print-recipe-btn btn'
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={loading}
        onClick={() => handlePrint()}
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
    </div>
  )
}

export default PrintRecipeBtn
