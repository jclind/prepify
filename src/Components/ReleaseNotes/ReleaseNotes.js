import React, { useEffect } from 'react'
import './ReleaseNotes.scss'
import { useLocation } from 'react-router-dom'
import { BsChevronDoubleRight, BsPencil } from 'react-icons/bs'
import { MdAddCircleOutline } from 'react-icons/md'
import { AiOutlineClose } from 'react-icons/ai'
import { BiWrench } from 'react-icons/bi'
import Modal from 'react-modal'
Modal.setAppElement('#root')

const VERSION_NUMBER = 'v1.3.3-beta'

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

  const additions = []
  const bugFixes = [
    'Add additional error handling to create recipe form',
    "Fix recipes showing 'new' results on 'recipes' page load regardless of dropdown selection",
    "Variety of small 'create recipe form' bug fixes",
  ]
  const improvements = [
    "Add loading and no-data UI to user's saved recipes pages",
    'Page now scrolls to top on route change',
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
        <h1 className='heading'>Prepify Release Notes • 4/4/2022</h1>
        <div className='release-tag'>{VERSION_NUMBER}</div>
        <p className='release-description'>
          This release is mostly focused on quality of life and website breaking
          bugs along with a few UI changes. Create recipes pages should now be a
          little better to deal with (along with actually working
          consistently... I hope).
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
