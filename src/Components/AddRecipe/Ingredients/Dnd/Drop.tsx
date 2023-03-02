import React, { FC } from 'react'
import { Droppable } from 'react-beautiful-dnd'

type DropProps = {
  children: React.ReactNode
}

const Drop: FC<DropProps> = ({ children }) => {
  return (
    <Droppable droppableId='droppable'>
      {(provided, snapshot) => (
        <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          className='ingredient-list'
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}

export default Drop
