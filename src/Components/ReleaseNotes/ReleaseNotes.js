import React, { useEffect } from 'react'
import './ReleaseNotes.scss'
import { Link, useLocation } from 'react-router-dom'
import { BsChevronDoubleRight, BsPencil } from 'react-icons/bs'
import { MdAddCircleOutline } from 'react-icons/md'
import { BiWrench } from 'react-icons/bi'
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
        <h1 className='heading'>Prepify Release Notes • 3/2/2022</h1>
        <div className='release-tag'>v1.1.0-beta</div>
        <p className='release-description'>
          This update brings a variety of user experience improvements including
          mobile responsiveness, a contact form for community response and bug
          reports, better loading indication, and many quality of life bug
          fixes.
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
                <div className='text'>Website wide responsive pages</div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Added{' '}
                  <Link to='/help' className='link'>
                    help page
                  </Link>{' '}
                  with form for bug reports / feature requests
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Added{' '}
                  <Link to='/not-real-page' className='link'>
                    404 page
                  </Link>
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Added modal popup after submitted recipe
                </div>
              </div>
            </div>
          </section>
          <section className='section'>
            <h3 className='sub-heading'>
              <BiWrench className='icon' /> Bug Fixes
            </h3>
            <div className='items'>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Recipe search input no longer unfocuses on recipe selection
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Image responsiveness fixed in individual recipe pages
                </div>
              </div>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Clear form button now correctly clears form from local storage
                </div>
              </div>
            </div>
          </section>
          <section className='section'>
            <h3 className='sub-heading'>
              <BsPencil className='icon' /> Improvments
            </h3>
            <div className='items'>
              <div className='item'>
                <BsChevronDoubleRight className='icon' />
                <div className='text'>
                  Added skeleton loading for recipe thumbnails and individual
                  recipe pages
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  )
}

export default ReleaseNotes
