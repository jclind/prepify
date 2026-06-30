import { PrinterIcon } from 'src/Components/icons'
import React, { FC, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'

type PrintRecipeBtnProps = {
  printedRef: React.RefObject<HTMLDivElement | null>
}

const PrintRecipeBtn: FC<PrintRecipeBtnProps> = ({ printedRef }) => {
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
        disabled={loading}
        onClick={() => handlePrint()}
      >
        <PrinterIcon className='icon' /> Print
        {loading && (
          <div className='loading'>
            <TailSpin
              height='30'
              width='30'
              color={spinnerColor}
              ariaLabel='loading'
            />
          </div>
        )}
      </button>
    </div>
  )
}

export default PrintRecipeBtn
