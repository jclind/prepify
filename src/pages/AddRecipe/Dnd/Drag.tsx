import React, { FC } from 'react'
import { Draggable } from 'react-beautiful-dnd'

type DragProps = {
  id: string
  index: number
  children: React.ReactElement
}
const Drag: FC<DragProps> = ({ id, index, children }) => {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef}>
          {React.cloneElement(children, { provided, snapshot })}
        </div>
      )}
    </Draggable>
  )
}

export { Drag as default }

export {}
