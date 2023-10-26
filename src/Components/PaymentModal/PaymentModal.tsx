import React, { useEffect, useMemo, useState } from 'react'
import Modal from 'react-modal'
import styles from '../../_exports.scss'
import './PaymentModal.scss'
import { SelectedType } from 'src/pages/Pricing/Pricing'
import { PiCaretRightBold } from 'react-icons/pi'
import { useAuth } from 'src/context/AuthContext'

import Select, { SingleValue } from 'react-select'
import countryList from 'react-select-country-list'
// import SalesTax from 'sales-tax'

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    background: styles.primaryBackground,
    borderRadius: styles.borderRadius,
    maxWidth: '80%',
    padding: '0',
    overflow: 'none',
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
  const [countryValue, setCountryValue] = useState('')

  useEffect(() => {
    if (countryValue) {
      // const test = lookup.byCountry(countryValue)
      // SalesTax.hasStateSalesTax()
      // SalesTax.hasStateSalesTax(countryValue, 'US', false)
      // SalesTax.getSalesTax('US', 'CA')
      // SalesTax.setTaxOriginCountry('US')
    }
  }, [countryValue])

  const handleChangeCountry = (
    e: SingleValue<{
      value: string
      label: string
    }>
  ) => {
    if (e) {
      setCountryValue(e.value)
    }
  }
  const options = useMemo(() => countryList().getData(), [])

  const closeModal = () => setIsOpen(false)

  const [activeLink, setActiveLink] = useState<'account' | 'payment'>('account')

  const { user } = useAuth() ?? {}

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
        <div className='input-data'>
          <div className='payment-nav'>
            <div className='account-details active'>
              <button className='btn-no-styles account-details-link'>
                Account Details
              </button>
            </div>
            <PiCaretRightBold className='caret-icon' />
            <div className='payment-details'>
              <button className='btn-no-styles payment-details-link'>
                Payment
              </button>
            </div>
          </div>
          {activeLink === 'account' ? (
            <>
              <div className='account-details-form'>
                <div className='email-container form-value-container'>
                  <div className='label'>Email</div>
                  <div className='email-text'>{user?.email}</div>
                </div>
                <div className='country-container form-value-container'>
                  <div className='label'>Country</div>
                  <Select
                    options={options}
                    onChange={handleChangeCountry}
                    className='select country-select'
                  />
                </div>
              </div>
              <button className='btn-no-styles next-btn'>To Payment</button>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

export default PaymentModal
