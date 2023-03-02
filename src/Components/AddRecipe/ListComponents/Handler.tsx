import React, { FC } from 'react'
import { DraggableProvided } from 'react-beautiful-dnd'
import { AiOutlineMenu } from 'react-icons/ai'

type HandlerProps = {
  provided?: DraggableProvided
  reorderActive?: boolean
}

const Handler: FC<HandlerProps> = ({ provided, reorderActive }) => {
  return (
    <div
      className={`handler ${
        reorderActive ? 'handler-active' : 'handler-inactive'
      }`}
      {...provided?.dragHandleProps}
    >
      <AiOutlineMenu className='icon' />
    </div>
  )
}

export default Handler
