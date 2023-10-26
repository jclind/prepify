import React, { useState } from 'react'
import './Pricing.scss'
import { BsStars } from 'react-icons/bs'
import PaymentModal from 'src/Components/PaymentModal/PaymentModal'

export type SelectedType = 'one-time' | 'monthly' | 'yearly'

const plans: {
  price: string
  category: string
  type: SelectedType
  tagLine: string
  comments: string[]
  paymentLink: string
}[] = [
  {
    price: '5',
    category: '1 month',
    type: 'monthly',
    tagLine: 'Only $1.16 a week',
    comments: ['Billed every month', 'Cancel anytime'],
    paymentLink: 'https://buy.stripe.com/test_bIY5ni9GCex37jq3cc',
  },
  {
    price: '45',
    category: '1 year',
    type: 'yearly',
    tagLine: 'Only $0.86 a week',
    comments: ['You save 25%', 'Cancel anytime'],
    paymentLink: 'https://buy.stripe.com/test_6oE7vqaKG60xcDKcMN',
  },
  {
    price: '120',
    category: 'one time',
    type: 'one-time',
    tagLine: 'One purchase',
    comments: ['Longer use = More savings', 'Lifelong access'],
    paymentLink: 'https://buy.stripe.com/test_7sI02Y9GC60xdHOeUW',
  },
]

const Pricing = () => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<{
    price: string
    type: SelectedType
  }>({ price: '45', type: 'monthly' })

  const handleSelectPlan = (price: string, type: SelectedType) => {
    const plan = { price, type }
    setSelectedPlan(plan)
    setIsPaymentModalOpen(true)
  }

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
        {plans.map(plan => {
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
              <button className='select-plan-btn btn-no-styles' onClick={}>
                Select This Plan
              </button>
            </div>
          )
        })}
      </div>
      <PaymentModal
        isOpen={isPaymentModalOpen}
        setIsOpen={setIsPaymentModalOpen}
        planData={selectedPlan}
      />
    </div>
  )
}

export default Pricing
