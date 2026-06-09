import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeSoftOverlay.scss'

const RecipeSoftOverlay: FC = () => (
  <BorderedBase rootClass='recipe-soft-overlay' headerStyle='overlay' />
)

export default RecipeSoftOverlay
