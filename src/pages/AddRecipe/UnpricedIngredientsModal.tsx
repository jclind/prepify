import React, { FC } from 'react'
import Modal from 'react-modal'
import { panelModalStylesWith } from 'src/util/modalStyles'
import './UnpricedIngredientsModal.scss'

type UnpricedIngredientsModalProps = {
  // The typed lines of the rows with no price. Null keeps the modal closed.
  lines: string[] | null
  isEditMode: boolean
  onAddPrices: () => void
  onPublishAnyway: () => void
}

// Asked at publish when some rows have no price. Each one adds $0 to the
// per-serving price, and the recipe page shows only that total, so without this
// an author can publish a cost that looks too cheap and never find out why.
const UnpricedIngredientsModal: FC<UnpricedIngredientsModalProps> = ({
  lines,
  isEditMode,
  onAddPrices,
  onPublishAnyway,
}) => (
  <Modal
    isOpen={lines !== null}
    onRequestClose={onAddPrices}
    style={panelModalStylesWith({
      maxWidth: '440px',
      width: 'calc(100% - 32px)',
    })}
    className='unpriced-ingredients-modal'
    contentLabel='Some ingredients have no price'
  >
    <h2 className='heading'>
      {lines?.length === 1
        ? '1 ingredient has no price'
        : `${lines?.length ?? 0} ingredients have no price`}
    </h2>
    <p className='text'>
      The cost per serving leaves these out, so it will look lower than it is.
      Select "add price" on a row to fill one in.
    </p>
    <ul className='lines'>
      {lines?.map((line, i) => (
        <li key={`${i}-${line}`}>{line}</li>
      ))}
    </ul>
    <div className='options'>
      <button type='button' className='btn btn--outline' onClick={onAddPrices}>
        Add prices
      </button>
      <button
        type='button'
        className='btn btn--primary'
        onClick={onPublishAnyway}
      >
        {isEditMode ? 'Save anyway' : 'Publish anyway'}
      </button>
    </div>
  </Modal>
)

export default UnpricedIngredientsModal
