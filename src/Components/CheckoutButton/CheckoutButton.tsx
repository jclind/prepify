import { loadStripe } from '@stripe/stripe-js'
import React from 'react'

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || '')

type CheckoutButtonProps = {
  userEmail: string
  productID: string
  mode: 'payment' | 'subscription'
  uid: string
  successURL: string
}

const CheckoutButton = ({
  userEmail,
  productID,
  mode,
  uid,
  successURL,
}: CheckoutButtonProps) => {
  const handleClick = async () => {
    const stripe = await stripePromise
    if (!stripe) {
      console.error('Error loading Stripe.')
      return
    }
    const { error } = await stripe?.redirectToCheckout({
      lineItems: [{ price: productID, quantity: 1 }],
      mode,
      successUrl: successURL,
      cancelUrl: `${window.location.origin.toString()}/pricing`,
      customerEmail: userEmail,
      clientReferenceId: uid,
    })

    if (error) {
      console.error(error)
    }
  }
  return (
    <button className='select-plan-link btn-no-styles' onClick={handleClick}>
      Select This Plan
    </button>
  )
}

export default CheckoutButton
