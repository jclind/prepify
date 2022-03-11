import React, { useEffect } from 'react'
import './ReleaseNotes.scss'
import { useLocation } from 'react-router-dom'
import { BsChevronDoubleRight, BsPencil } from 'react-icons/bs'
import { MdAddCircleOutline } from 'react-icons/md'
import { AiOutlineClose } from 'react-icons/ai'
import Modal from 'react-modal'
Modal.setAppElement('#root')

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
        <h1 className='heading'>Prepify Release Notes • 3/11/2022</h1>
        <div className='release-tag'>v1.3.0-beta</div>
        <p className='release-description'>
          This update focuses on overall website enhancement and functionality.
          Recipe search has been fixed to show accurate results from given
          filters and search text. Recipe's can now be printed, and recipe
          ingredient quantity fractions have been fixed to show more accurate
          and common fractions.
        </p>
        <div className='content'>
          <section className='section'>
            <h3 className='sub-heading'>
              <MdAddCircleOutline className='icon' />
              Additions
            </h3>
            <div className='items'>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Add nutrition facts per serving for new recipes
                </div>
              </div>
            </div>
          </section>
          {/* <section className='section'>
            <h3 className='sub-heading'>
              <BiWrench className='icon' /> Bug Fixes
            </h3>
            <div className='items'>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Search recipes input now responds with correct search
                  link/results
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Search input no longer stays focused on search submit
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>Serving size no longer defaults to 0</div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Recipe images now get cropped instead of stretched
                </div>
              </div>
            </div>
          </section> */}
          <section className='section'>
            <h3 className='sub-heading'>
              <BsPencil className='icon' /> Improvments
            </h3>
            <div className='items'>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Add nav-link dropdown for secondary links
                </div>
              </div>
            </div>
          </section>
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
