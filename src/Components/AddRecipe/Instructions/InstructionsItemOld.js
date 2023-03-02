import React, { useState, useRef } from 'react'
import { AiOutlineClose } from 'react-icons/ai'

const InstructionsItem = ({
  instruction,
  index,
  deleteInstruction,
  updateInstruction,
}) => {
  const { content, id } = instruction

  const [currContent, setCurrContent] = useState(content)

  const contentId = `instruction-content-${id}`

  const contentRef = useRef()

  const handleContentChange = e => {
    const newContent = contentRef.current.innerText
    if (newContent && newContent !== content) {
      setCurrContent(newContent)

      const updatedIngredient = { ...instruction, content: newContent }
      updateInstruction(updatedIngredient, id)
    } else {
      contentRef.current.innerText = content
    }
  }

  const handleKeyPress = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.target.blur()
    }
  }

  return (
    <div className='instructions-item'>
      <div className='index'>{index}.</div>
      <p
        className='content'
        id={contentId}
        contentEditable
        suppressContentEditableWarning={true}
        ref={contentRef}
        onBlur={handleContentChange}
        onKeyPress={handleKeyPress}
      >
        {currContent}
      </p>
      <AiOutlineClose
        className='remove'
        onClick={() => deleteInstruction(id)}
      />
    </div>
  )
}

export default InstructionsItem
