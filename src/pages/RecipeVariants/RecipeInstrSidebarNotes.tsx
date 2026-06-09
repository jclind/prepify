import React, { FC } from 'react'
import BorderedBase from './bordered/BorderedBase'
import './RecipeInstrSidebarNotes.scss'

const RecipeInstrSidebarNotes: FC = () => (
  <BorderedBase rootClass='recipe-instr-sidebar-notes' headerStyle='bar' stepAside='notes' />
)

export default RecipeInstrSidebarNotes
