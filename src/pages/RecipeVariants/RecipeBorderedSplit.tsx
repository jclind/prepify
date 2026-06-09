import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeBorderedSplit.scss'

const RecipeBorderedSplit: FC = () => (
  <BorderedBase rootClass='recipe-bordered-split' splitBody />
)

export default RecipeBorderedSplit
