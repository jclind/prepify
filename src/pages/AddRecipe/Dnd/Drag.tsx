import React, { FC } from 'react'
import { Draggable } from '@hello-pangea/dnd'

type DragProps = {
  id: string
  index: number
  children: React.ReactElement<any>
}
const Drag: FC<DragProps> = ({ id, index, children }) => {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) =>
        React.cloneElement(children, { provided, snapshot })
      }
    </Draggable>
  )
}

export { Drag as default }

export {}
