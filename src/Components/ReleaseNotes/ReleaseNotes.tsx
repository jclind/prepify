import React, { FC, useEffect } from 'react'
import './ReleaseNotes.scss'
import { useLocation } from 'react-router-dom'
import { BsChevronDoubleRight, BsPencil } from 'react-icons/bs'
import { MdAddCircleOutline } from 'react-icons/md'
import { AiOutlineClose } from 'react-icons/ai'
import { BiWrench } from 'react-icons/bi'
import Modal from 'react-modal'
// import packageInfo from '../../../package.json'
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

const RELEASE_DATE = '3/14/2023'
const version = '2.0.0-beta'
const description =
  "We've made significant improvements to our application, including a faster and easier recipe creation process, improved search filters, better code quality, and enhanced database performance and reliability. These changes are designed to create a smoother and more enjoyable experience for our users."

type ReleaseNotesProps = {
  releaseNotesModalIsOpen: boolean
  setReleaseNotesModalIsOpen: (val: boolean) => void
}

const ReleaseNotes: FC<ReleaseNotesProps> = ({
  releaseNotesModalIsOpen,
  setReleaseNotesModalIsOpen,
}) => {
  const closeModal = () => {
    setReleaseNotesModalIsOpen(false)
  }

  const additions: string[] = [
    "Create recipes page is now remastered and ingredient input no longer requires users to fetch the ingredient price individually, instead with the help of the spoonacular api all ingredient data is retrieved from the user's ingredient string input.",
    'Individual recipe pages are also updated to support more information.',
    'Search page now has multiple search filters',
  ]
  const bugFixes: string[] = []
  const improvements: string[] = [
    'Add Typescript support to the majority of components',
    'Database refactor updates a large number of functions and data formats',
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
        <h1 className='heading'>Prepify Release Notes • {RELEASE_DATE}</h1>
        <div className='release-tag'>v{version}</div>
        <p className='release-description'>{description}</p>
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
