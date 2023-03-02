import React, { Dispatch, ReactNode, SetStateAction } from 'react'
import { DragDropContext, DropResult } from 'react-beautiful-dnd'
import { reorder } from 'src/util/reorder'
import Drop from './Drop'

type DndContextProps<T> = {
  list: T[]
  setList: Dispatch<SetStateAction<T[]>>
  children: ReactNode
}

const DndContext = <T extends {}>({
  list,
  setList,
  children,
}: DndContextProps<T>) => {
  const onDragEnd = (result: DropResult) => {
    // dropped outside the list
    if (!result.destination) {
      return
    }
    // console.log(result)

    const items = reorder(list, result.source.index, result.destination.index)

    setList(items)
  }
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Drop>{children}</Drop>
    </DragDropContext>
  )
}

export default DndContext
