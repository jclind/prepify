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
  successURL: string
}[] = [
  {
    price: '5',
    category: '1 month',
    type: 'monthly',
    tagLine: 'Only $1.16 a week',
    comments: ['Billed every month', 'Cancel anytime'],
    productID: 'price_1O5YNeFaUuOS9sKf3brluO6d',
    mode: 'subscription',
    successURL: `${window.location.origin.toString()}/checkout/success/premium/monthly`,
  },
  {
    price: '45',
    category: '1 year',
    type: 'yearly',
    tagLine: 'Only $0.86 a week',
    comments: ['You save 25%', 'Cancel anytime'],
    productID: 'price_1O5YRpFaUuOS9sKfJp41oEkC',
    mode: 'subscription',
    successURL: `${window.location.origin.toString()}/checkout/success/premium/yearly`,
  },
  {
    price: '120',
    category: 'one time',
    type: 'one-time',
    tagLine: 'One purchase',
    comments: ['Longer use = More savings', 'Lifelong access'],
    productID: 'price_1O5YSWFaUuOS9sKfucaaeUNv',
    mode: 'payment',
    successURL: `${window.location.origin.toString()}/checkout/success/premium/one-time`,
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
                        successURL={plan.successURL}
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

export interface Pokedex {
  id: string
  object: string
  api_version: Date
  created: number
  data: Data
  livemode: boolean
  pending_webhooks: number
  request: Request
  type: string
}

export interface Data {
  object: Object
}

export interface Object {
  id: string
  object: string
  account_country: string
  account_name: string
  account_tax_ids: null
  amount_due: number
  amount_paid: number
  amount_remaining: number
  amount_shipping: number
  application: null
  application_fee_amount: null
  attempt_count: number
  attempted: boolean
  auto_advance: boolean
  automatic_tax: AutomaticTax
  billing_reason: string
  charge: string
  collection_method: string
  created: number
  currency: string
  custom_fields: null
  customer: string
  customer_address: CustomerAddress
  customer_email: string
  customer_name: string
  customer_phone: null
  customer_shipping: null
  customer_tax_exempt: string
  customer_tax_ids: any[]
  default_payment_method: null
  default_source: null
  default_tax_rates: any[]
  description: null
  discount: null
  discounts: any[]
  due_date: null
  effective_at: number
  ending_balance: number
  footer: null
  from_invoice: null
  hosted_invoice_url: string
  invoice_pdf: string
  last_finalization_error: null
  latest_revision: null
  lines: Lines
  livemode: boolean
  metadata: Metadata
  next_payment_attempt: null
  number: string
  on_behalf_of: null
  paid: boolean
  paid_out_of_band: boolean
  payment_intent: string
  payment_settings: PaymentSettings
  period_end: number
  period_start: number
  post_payment_credit_notes_amount: number
  pre_payment_credit_notes_amount: number
  quote: null
  receipt_number: null
  rendering: null
  rendering_options: null
  shipping_cost: null
  shipping_details: null
  starting_balance: number
  statement_descriptor: null
  status: string
  status_transitions: StatusTransitions
  subscription: string
  subscription_details: SubscriptionDetails
  subtotal: number
  subtotal_excluding_tax: number
  tax: null
  test_clock: null
  total: number
  total_discount_amounts: any[]
  total_excluding_tax: number
  total_tax_amounts: any[]
  transfer_data: null
  webhooks_delivered_at: number
}

export interface AutomaticTax {
  enabled: boolean
  status: null
}

export interface CustomerAddress {
  city: null
  country: string
  line1: null
  line2: null
  postal_code: string
  state: null
}

export interface Lines {
  object: string
  data: Datum[]
  has_more: boolean
  total_count: number
  url: string
}

export interface Datum {
  id: string
  object: string
  amount: number
  amount_excluding_tax: number
  currency: string
  description: string
  discount_amounts: any[]
  discountable: boolean
  discounts: any[]
  livemode: boolean
  metadata: Metadata
  period: Period
  plan: Plan
  price: Price
  proration: boolean
  proration_details: ProrationDetails
  quantity: number
  subscription: string
  subscription_item: string
  tax_amounts: any[]
  tax_rates: any[]
  type: string
  unit_amount_excluding_tax: string
}

export interface Metadata {}

export interface Period {
  end: number
  start: number
}

export interface Plan {
  id: string
  object: string
  active: boolean
  aggregate_usage: null
  amount: number
  amount_decimal: string
  billing_scheme: string
  created: number
  currency: string
  interval: string
  interval_count: number
  livemode: boolean
  metadata: Metadata
  nickname: null
  product: string
  tiers_mode: null
  transform_usage: null
  trial_period_days: null
  usage_type: string
}

export interface Price {
  id: string
  object: string
  active: boolean
  billing_scheme: string
  created: number
  currency: string
  custom_unit_amount: null
  livemode: boolean
  lookup_key: null
  metadata: Metadata
  nickname: null
  product: string
  recurring: Recurring
  tax_behavior: string
  tiers_mode: null
  transform_quantity: null
  type: string
  unit_amount: number
  unit_amount_decimal: string
}

export interface Recurring {
  aggregate_usage: null
  interval: string
  interval_count: number
  trial_period_days: null
  usage_type: string
}

export interface ProrationDetails {
  credited_items: null
}

export interface PaymentSettings {
  default_mandate: null
  payment_method_options: null
  payment_method_types: null
}

export interface StatusTransitions {
  finalized_at: number
  marked_uncollectible_at: null
  paid_at: number
  voided_at: null
}

export interface SubscriptionDetails {
  metadata: Metadata
}

export interface Request {
  id: string
  idempotency_key: string
}

const test = (body: Pokedex) => {
  const dataObject = body.data.object

  const newOrder = {
    userID: dataObject.client_reference_id,
    customerID: dataObject.customer,
    paymentIntentID: dataObject.payment_intent,
    mode: dataObject.mode,
    subscription: dataObject.subscription,
    subTotal: dataObject.amount_subtotal,
    total: dataObject.amount_total,
    customerDetails: dataObject.customer_details,
    dateCreated: dataObject.created,
    dateExpiring: dataObject.expires_at,
    paymentStatus: dataObject.payment_status,
    successURL: dataObject.success_url,
  }
}

export default Pricing
