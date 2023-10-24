import React from 'react'
import Modal from 'react-modal'
import styles from '../../_exports.scss'
import './PaymentModal.scss'
import { SelectedType } from 'src/pages/Pricing/Pricing'

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    background: styles.primaryBackground,
    borderRadius: '5px',
    maxWidth: '80%',
  },
  overlay: {
    zIndex: '1000',
    background: 'rgba(0, 0, 0, 0.6)',
  },
}

type PaymentModalProps = {
  isOpen: boolean
  setIsOpen: (val: boolean) => void
  planData: { price: string; type: SelectedType }
}

const PaymentModal = ({ isOpen, setIsOpen, planData }: PaymentModalProps) => {
  const closeModal = () => setIsOpen(false)

  const { price, type } = planData

  const priceBeforeTax = (Number(price) / 1.06).toFixed(2)
  const tax = (Number(price) - Number(priceBeforeTax)).toFixed(2)

  const planTypeText = (type: SelectedType) => {
    if (type === 'monthly') return '1 Month Prepify Premium Subscription'
    if (type === 'yearly') return '1 Year Prepify Premium Subscription'
    else return 'One Time Prepify Premium Purchase'
  }

  return (
    <Modal
      isOpen={isOpen}
      // onAfterOpen={afterOpenModal}
      onRequestClose={closeModal}
      style={customStyles}
      // contentLabel='Example Modal'
    >
      <div className='content payment-modal-content'>
        <div className='order-summary'>
          <h5>Order Summary</h5>
          <div className='purchase-type-container'>
            <div className='title'>{planTypeText(type)}</div>
            {/* <div className='subtitle'>
              {type !== 'one-time'
                ? `(Recurring ${type}, Cancel Anytime)`
                : null}
            </div> */}
            <div className='price'>
              <span>${planData.price}.00</span> inc. tax
            </div>
          </div>
          <div className='br spaced'></div>
          <div className='price-overview'>
            <div className='amount item'>
              <div className='label'>Amount</div>{' '}
              <div className='price'>${priceBeforeTax}</div>
            </div>
            <div className='tax item'>
              <div className='label'>Tax</div>{' '}
              <div className='price'>${tax}</div>
            </div>
            <div className='br'></div>
            <div className='total item'>
              <div className='label'>Total</div>
              <div className='price'>${price}.00</div>
            </div>
          </div>
        </div>
        <div className='input-data'></div>
      </div>
    </Modal>
  )
}

export default PaymentModal
