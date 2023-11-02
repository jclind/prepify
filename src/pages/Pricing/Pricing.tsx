import React, { useState } from 'react'
import './Pricing.scss'
import { BsStars } from 'react-icons/bs'
import { useAuth } from 'src/context/AuthContext'

import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import CheckoutButton from 'src/Components/CheckoutButton/CheckoutButton'

export type SelectedType = 'one-time' | 'monthly' | 'yearly'

const plans: {
  price: string
  category: string
  type: SelectedType
  tagLine: string
  comments: string[]
  productID: string
  mode: 'payment' | 'subscription'
}[] = [
  {
    price: '5',
    category: '1 month',
    type: 'monthly',
    tagLine: 'Only $1.16 a week',
    comments: ['Billed every month', 'Cancel anytime'],
    productID: 'price_1O5YNeFaUuOS9sKf3brluO6d',
    mode: 'subscription',
  },
  {
    price: '45',
    category: '1 year',
    type: 'yearly',
    tagLine: 'Only $0.86 a week',
    comments: ['You save 25%', 'Cancel anytime'],
    productID: 'price_1O5YRpFaUuOS9sKfJp41oEkC',
    mode: 'subscription',
  },
  {
    price: '120',
    category: 'one time',
    type: 'one-time',
    tagLine: 'One purchase',
    comments: ['Longer use = More savings', 'Lifelong access'],
    productID: 'price_1O5YSWFaUuOS9sKfucaaeUNv',
    mode: 'payment',
  },
]

const Pricing = () => {
  // const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  // const [selectedPlan, setSelectedPlan] = useState<{
  //   price: string
  //   type: SelectedType
  // }>({ price: '45', type: 'monthly' })

  // const handleSelectPlan = (price: string, type: SelectedType) => {
  //   const plan = { price, type }
  //   setSelectedPlan(plan)
  //   setIsPaymentModalOpen(true)
  // }

  const { user } = useAuth() ?? {}

  const stripePromise = loadStripe(
    process.env.REACT_APP_STRIPE_PUBLIC_KEY || ''
  )

  return (
    <div className='pricing-page page'>
      <h1 className='title'>Premium Membership</h1>
      <div className='description'>
        Unlock Premium Benefits with Prepify's Premium Subscription! Choose from
        our three flexible payment plans and elevate your cooking experience and
        enjoy the convenience of Prepify Premium today.
      </div>
      <div className='features-container'>
        {/* <BsStars className='star-1 star' /> */}
        {/* <PiStarFourFill className='star-2 star' /> */}
        {/* <PiStarFourFill className='star-3 star' /> */}
        {/* <PiStarFourFill className='star-4 star' /> */}
        <div className='features-title'>
          <BsStars className='star' />
          Features
          {/* <BsStars /> */}
          {/* <PiShootingStarFill className='star-2 star' /> */}
          {/* <PiStarFourFill className='star-3 star' /> */}
          {/* <PiStarFourFill className='star-4 star' /> */}
        </div>
        <ul className='features'>
          <li className='feat'>Simple and easy recipe creating AI tool</li>
          <li className='feat'>In depth nutritional analysis</li>
          <li className='feat'>A library of exclusive recipes</li>
          <li className='feat'>Removed Ads</li>
        </ul>
      </div>
      <h1 className='plans-title'>Plans</h1>
      <div className='plans'>
        {user && user.email
          ? plans.map(plan => {
              const userEmail = user.email || ''
              return (
                <div className='plan'>
                  <div className='type'>{plan.category}</div>
                  <div className='price'>${plan.price}</div>
                  <div className='tag-line'>{plan.tagLine}</div>
                  <div className='comments'>
                    {plan.comments &&
                      plan.comments.map(comment => {
                        return <div className='comment'>{comment}</div>
                      })}
                  </div>
                  <Elements stripe={stripePromise}>
                    {userEmail && user && user.uid ? (
                      <CheckoutButton
                        userEmail={userEmail}
                        productID={plan.productID}
                        mode={plan.mode}
                        uid={user.uid}
                      />
                    ) : null}
                  </Elements>
                  {/* <button
                    className='select-plan-link btn-no-styles'
                    // href={paymentLink}
                    onClick={handleClick}
                  >
                    Select This Plan
                  </button> */}
                </div>
              )
            })
          : null}
      </div>
      {/* <PaymentModal
        isOpen={isPaymentModalOpen}
        setIsOpen={setIsPaymentModalOpen}
        planData={selectedPlan}
      /> */}
    </div>
  )
}

export default Pricing
