import React, { FC } from 'react'
import { Draggable, DraggingStyle, NotDraggingStyle } from 'react-beautiful-dnd'

type DragProps = {
  id: string
  index: number
  children: React.ReactElement
}
const Drag: FC<DragProps> = ({ id, index, children }) => {
  const getItemStyle = (isDragging: boolean, draggableStyle: any) => ({
    // change background colour if dragging
    boxShadow: isDragging
      ? 'rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px'
      : 'none',
    // styles we need to apply on draggables
    ...draggableStyle,
  })

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
