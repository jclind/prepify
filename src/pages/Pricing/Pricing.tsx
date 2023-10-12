import React from 'react'
import './Pricing.scss'
import { BsStars } from 'react-icons/bs'
import { PiStarFourFill, PiShootingStarFill } from 'react-icons/pi'

const plans = [
  {
    price: '5',
    type: '1 month',
    tagLine: 'Only $1.16 a week',
    comments: ['Billed every month', 'Cancel anytime'],
  },
  {
    price: '45',
    type: '1 year',
    tagLine: 'Only $0.86 a week',
    comments: ['You save 25%', 'Cancel anytime'],
  },
  {
    price: '120',
    type: 'one time',
    tagLine: 'One purchase',
    comments: ['Longer use = More savings', 'Lifelong access'],
  },
]

const Pricing = () => {
  return (
    <div className='pricing-page'>
      <h1 className='title'>Premium Membership Pricing</h1>
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
      <div className='plans'>
        {plans.map(plan => {
          return (
            <div className='plan'>
              <div className='type'>{plan.type}</div>
              <div className='price'>${plan.price}</div>
              <div className='tag-line'>{plan.tagLine}</div>
              <div className='comments'>
                {plan.comments &&
                  plan.comments.map(comment => {
                    return <div className='comment'>{comment}</div>
                  })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Pricing
