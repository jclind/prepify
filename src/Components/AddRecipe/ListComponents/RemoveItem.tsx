import React, { FC } from 'react'
import { AiOutlineClose } from 'react-icons/ai'
type RemoveItemProps = {
  removeItem: (id: string) => void
  id: string
  reorderActive: boolean
}
const RemoveItem: FC<RemoveItemProps> = ({ removeItem, id, reorderActive }) => {
  return (
    <button
      className={`remove-ingredient-btn ${
        reorderActive
          ? 'remove-ingredient-active'
          : 'remove-ingredient-inactive'
      }`}
      onClick={e => {
        e.stopPropagation()
        removeItem(id)
      }}
    >
      <AiOutlineClose className='icon' />
    </button>
  )
}

export default RemoveItem
