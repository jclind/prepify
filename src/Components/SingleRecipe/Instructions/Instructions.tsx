import React, { useState } from 'react'
import './Directions.scss'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { InstructionsType } from 'types'

const skeletonColor = '#d6d6d6'

type IntructionItemProps = {
  instruction: InstructionsType | null
  loading: boolean
}

const InstructionItem = ({ instruction, loading }: IntructionItemProps) => {
  const [checked, setChecked] = useState(false)

  const handleOnClick = () => {
    if (!loading) {
      setChecked(!checked)
    }
  }
  if (loading || !instruction) {
    return (
      <div className='direction'>
        <div className='number-container'>
          <Skeleton baseColor={skeletonColor} className='number skeleton' />
        </div>
        <Skeleton
          baseColor={skeletonColor}
          count={3}
          className='content skeleton'
        />
      </div>
    )
  } else if ('content' in instruction) {
    return (
      <div className='direction' key={instruction.id}>
        <div className='number-container'>
          <div className='number'>{instruction.index}</div>
        </div>
        <div className='content'>{instruction.content}</div>
      </div>
    )
  } else {
    return (
      <h4 className='title'>
        <span className='text'>{instruction.label}</span>
        <div className='divider'></div>
      </h4>
    )
  }
}

type InstructionsProps = {
  instructions: InstructionsType[]
  loading: boolean
}

const Instructions = ({ instructions, loading }: InstructionsProps) => {
  let stepNum = 0

  return (
    <div className='directions'>
      <h3 className='title'>
        {loading ? (
          <Skeleton baseColor={skeletonColor} width={163} height={32} />
        ) : (
          'Directions:'
        )}
      </h3>
      <div className='directions-lists'>
        {!loading && instructions ? (
          instructions.map((instruction, idx1) => {
            return (
              <InstructionItem
                instruction={instruction}
                loading={false}
                key={instruction.id}
              />
            )
          })
        ) : (
          <div className='list'>
            <InstructionItem instruction={null} loading={true} />
            <InstructionItem instruction={null} loading={true} />
            <InstructionItem instruction={null} loading={true} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Instructions
