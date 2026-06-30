import { ChevronsRightIcon, CloseIcon, EditIcon, PlusCircleIcon, WrenchIcon } from 'src/Components/icons'
import React, { FC, useEffect } from 'react'
import './ReleaseNotes.scss'
import { useLocation } from 'react-router-dom'
import Modal from 'react-modal'
import packageJSON from '../../../package.json'
import { panelModalStyles } from 'src/util/modalStyles'

const version = packageJSON.version

// NOTE: confirm/update RELEASE_DATE to the actual ship date at cutover, alongside
// the package.json 1.0.0 bump and flipping `isBeta` to false (see RELEASE_PLAN.md).
const RELEASE_DATE = '6/23/2026'
const isBeta = true
const description =
  "Prepify 1.0 — our biggest update yet. A redesigned home page, smarter search, " +
  'personalized recommendations, and public profiles, plus a wave of fixes and ' +
  'accessibility improvements across the app.'

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
    'Personalized "For You" recommendations on the home page.',
    '"What should I cook?" — a taste-aware random recipe pick.',
    'Public profiles at /u/username with achievements and recipe stats.',
    'Report controls for recipes, reviews, and users.',
  ]
  const improvements: string[] = [
    'Redesigned home, recipe browsing, single-recipe, and account pages.',
    'Smarter search with typo-tolerant autocomplete.',
    'Faster, more reliable recipe creation with optimistic ingredient add.',
    'Accessibility and link-preview (SEO) improvements throughout.',
  ]
  const bugFixes: string[] = [
    'Saving recipes now persists reliably.',
    'Removing a review or rating updates the star average correctly.',
    'Accurate per-serving price calculation.',
    'Account ratings now load recipe images without flashing empty.',
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
      style={panelModalStyles}
      className='release-notes-modal'
    >
      <button className='close-modal btn btn--icon' onClick={closeModal}>
        <CloseIcon className='icon' />
      </button>
      <div className='release-notes-content-container'>
        <h1 className='heading'>Prepify Release Notes • {RELEASE_DATE}</h1>
        <div className='release-tag'>
          v{version}
          {isBeta ? '-beta' : ''}
        </div>
        <p className='release-description'>{description}</p>
        <div className='content'>
          {additions.length > 0 && (
            <section className='section'>
              <h3 className='sub-heading'>
                <PlusCircleIcon className='icon' />
                Additions
              </h3>
              <div className='items'>
                {additions.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <ChevronsRightIcon className='icon' />
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
                <WrenchIcon className='icon' /> Bug Fixes
              </h3>
              <div className='items'>
                {bugFixes.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <ChevronsRightIcon className='icon' />
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
                <EditIcon className='icon' /> Improvements
              </h3>
              <div className='items'>
                {improvements.map((item, idx) => {
                  return (
                    <div className='item' key={idx}>
                      <ChevronsRightIcon className='icon' />
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
          className='all-release-notes-btn btn btn--ghost'
        >
          View All Release Notes
        </a>
      </div>
    </Modal>
  )
}

export default ReleaseNotes
