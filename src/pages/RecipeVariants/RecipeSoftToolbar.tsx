import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeSoftToolbar.scss'

const RecipeSoftToolbar: FC = () => (
  <BorderedBase rootClass='recipe-soft-toolbar' headerStyle='toolbar' />
)

export default RecipeSoftToolbar
