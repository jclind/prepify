import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeSoftStrip.scss'

const RecipeSoftStrip: FC = () => (
  <BorderedBase rootClass='recipe-soft-strip' headerStyle='strip' />
)

export default RecipeSoftStrip
