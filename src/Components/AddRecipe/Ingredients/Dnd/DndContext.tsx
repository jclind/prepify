import React, { Dispatch, SetStateAction } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import { reorder } from 'src/util/reorder'
import Drop from './Drop'

type DndContextProps<T> = {
  list: T[]
  setList: Dispatch<SetStateAction<T[]>>
  setIsDragging: Dispatch<SetStateAction<boolean>>
  children: React.ReactElement
}

const DndContext = <T extends {}>({
  list,
  setList,
  setIsDragging,
  children,
}: DndContextProps<T>) => {
  const onDragEnd = (result: DropResult) => {
    setIsDragging(false)
    // dropped outside the list
    if (!result.destination) {
      return
    }
    // console.log(result)

    const items = reorder(list, result.source.index, result.destination.index)

    setList(items)
  }
  return (
    <DragDropContext
      onDragEnd={onDragEnd}
      onDragStart={() => setIsDragging(true)}
    >
      <Drop>{children}</Drop>
    </DragDropContext>
  )
}

export default DndContext
