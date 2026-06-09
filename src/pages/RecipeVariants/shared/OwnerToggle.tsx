import React, { FC } from 'react'
import { AiOutlineUser } from 'react-icons/ai'
import { BiUserCircle } from 'react-icons/bi'
import './OwnerToggle.scss'

type Props = {
  isOwner: boolean
  onChange: (v: boolean) => void
}

/**
 * Dev-only preview control for the recipe design variants. Lets you flip the
 * page between the public "visitor" view and the "made by you" owner view so
 * the owner-specific styling (Edit/Delete controls, owner stats) can be compared
 * without needing real auth. Anchored top-right, clear of the bottom-center
 * RecipeDesignSwitcher.
 */
const OwnerToggle: FC<Props> = ({ isOwner, onChange }) => {
  return (
    <div className='owner-toggle'>
      <span className='ot-label'>Viewing as</span>
      <div className='ot-switch' role='group' aria-label='Viewing as'>
        <button
          className={!isOwner ? 'active' : ''}
          onClick={() => onChange(false)}
          type='button'
        >
          <AiOutlineUser /> Visitor
        </button>
        <button
          className={isOwner ? 'active' : ''}
          onClick={() => onChange(true)}
          type='button'
        >
          <BiUserCircle /> You
        </button>
      </div>
    </div>
  )
}

export default OwnerToggle
