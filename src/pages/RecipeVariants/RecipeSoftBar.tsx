import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeSoftBar.scss'

const RecipeSoftBar: FC = () => (
  <BorderedBase rootClass='recipe-soft-bar' headerStyle='bar' />
)

export default RecipeSoftBar
