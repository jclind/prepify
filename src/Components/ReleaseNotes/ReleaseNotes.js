import React, { useEffect } from 'react'
import './ReleaseNotes.scss'
import { useLocation } from 'react-router-dom'
import { BsChevronDoubleRight, BsPencil } from 'react-icons/bs'
import { MdAddCircleOutline } from 'react-icons/md'
import { AiOutlineClose } from 'react-icons/ai'
import { BiWrench } from 'react-icons/bi'
import Modal from 'react-modal'
Modal.setAppElement('#root')

const VERSION_NUMBER = 'v1.4.0-beta'

const customStyles = {
  content: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',

    background: '#eeeeee',
    padding: '2.5rem',
    borderRadius: '5px',
  },
  overlay: {
    zIndex: '1000',
    background: 'rgba(0, 0, 0, 0.5)',
  },
}

const ReleaseNotes = ({
  releaseNotesModalIsOpen,
  setReleaseNotesModalIsOpen,
}) => {
  const closeModal = () => {
    setReleaseNotesModalIsOpen(false)
  }

  const additions = ['Add recipe and recipe serving price']
  const bugFixes = [
    'Recipe nutrition data now submitted to recipe data',
    'Fix infinite loading bug in the saved recipes page if no recipes are saved',
    'Multiple minor ui fixes and improvements',
    'Current user recipe reviews now visible',
  ]
  const improvements = [
    'Recipes can now be sorted by price in recipe search page',
    'Add additional recipe data showing fridge and freezer life for all recipes',
  ]

  const location = useLocation()

  useEffect(() => {
    setReleaseNotesModalIsOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    if (releaseNotesModalIsOpen) {
      document.body.style.overflowY = 'hidden'
    } else {
      document.body.style.overflowY = 'scroll'
    }
  }, [releaseNotesModalIsOpen])
  return (
    <Modal
      isOpen={releaseNotesModalIsOpen}
      onRequestClose={closeModal}
      style={customStyles}
      className='release-notes-modal'
    >
      <button className='close-modal btn' onClick={closeModal}>
        <AiOutlineClose className='icon' />
      </button>
      <div className='release-notes-content-container'>
        <h1 className='heading'>Prepify Release Notes • 5/17/2022</h1>
        <div className='release-tag'>{VERSION_NUMBER}</div>
        <p className='release-description'>
          Recipe pricing is finally here! I spent a lot of time trying to
          discover the best way to implement this feature. I looked into
          countless apis and databases for a solution that wouldn't cost me an
          arm and a leg, and I even considered webscraping for gathering
          ingredient prices. Unfortunately, due to the high costs of apis and
          sheer amount of time it would take to parse through webscraped data, I
          decided to gather ingredient prices through user input as a temporary
          solution.
        </p>
        <div className='content'>
          {additions.length > 0 && (
            <section className='section'>
              <h3 className='sub-heading'>
                <MdAddCircleOutline className='icon' />
                Additions
              </h3>
              <div className='items'>
                {additions.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <BsChevronDoubleRight className='icon' />
                      <div className='text'>{item}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
          {bugFixes.length > 0 && (
            <section className='section'>
              <h3 className='sub-heading'>
                <BiWrench className='icon' /> Bug Fixes
              </h3>
              <div className='items'>
                {bugFixes.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <BsChevronDoubleRight className='icon' />
                      <div className='text'>{item}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
          {improvements.length > 0 && (
            <section className='section'>
              <h3 className='sub-heading'>
                <BsPencil className='icon' /> Improvements
              </h3>
              <div className='items'>
                {improvements.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <BsChevronDoubleRight className='icon' />
                      <div className='text'>{item}</div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
        <a
          href='https://github.com/jclind/prepify/releases'
          className='all-release-notes-btn btn'
        >
          View All Release Notes
        </a>
      </div>
    </Modal>
  )
}

export default ReleaseNotes
