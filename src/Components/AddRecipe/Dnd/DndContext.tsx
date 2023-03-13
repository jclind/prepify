import React from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import { reorder } from '../../../util/reorder'
import Drop from './Drop'

type DndContextProps<T> = {
  list: T[]
  handleListChange: (list: T[]) => void
  children: React.ReactElement
}

const DndContext = <T extends {}>({
  list,
  handleListChange,
  children,
}: DndContextProps<T>) => {
  const onDragEnd = (result: DropResult) => {
    // dropped outside the list
    if (!result.destination) {
      return
    }

    const items = reorder(list, result.source.index, result.destination.index)

    handleListChange(items)
  }
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Drop>{children}</Drop>
    </DragDropContext>
  )
}

export { DndContext as default }

export {}
