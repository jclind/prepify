import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeInstrSidebarIng.scss'

const RecipeInstrSidebarIng: FC = () => (
  <BorderedBase rootClass='recipe-instr-sidebar-ing' headerStyle='bar' stepAside='ingredients' />
)

export default RecipeInstrSidebarIng
