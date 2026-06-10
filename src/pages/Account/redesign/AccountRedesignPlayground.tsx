import React, { FC, useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi'
import { variants, variantGroups } from './registry'
import './playground.scss'

// Namespaced modifiers — NOT 'r2'/'r3'/'creative', which collide with variant
// root classes (e.g. r03.scss's `.r3`) and would leak their full-page styles
// onto this little badge.
const badgeClass = (group: string) =>
  group.startsWith('Round 5') ? 'grp-r5'
    : group.startsWith('Round 4') ? 'grp-r4'
    : group.startsWith('Round 3') ? 'grp-r3'
    : group.startsWith('Round 2') ? 'grp-r2'
    : group.includes('Creative') ? 'grp-creative'
    : ''

// Dev-only preview harness for the account-page redesign. Lets us flip through
// all 20 variants live (← / → or the dropdown), persisting the pick so a
// refresh keeps your place. Mirrors the switcher approach used for the nav
// redesigns. Not wired into the production nav — reachable at /account-redesign.

// Bumped per round so the switcher opens on the newest set.
const STORAGE_KEY = 'prepify:account-redesign:variant:v5'

const AccountRedesignPlayground: FC = () => {
  const [index, setIndex] = useState<number>(() => {
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isInteger(saved) && saved >= 0 && saved < variants.length
      ? saved
      : 0
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(index))
  }, [index])

  const go = useCallback((delta: number) => {
    setIndex(prev => (prev + delta + variants.length) % variants.length)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const current = variants[index]
  const Variant = current.Component

  return (
    <div className='acct-redesign-playground'>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Account redesign · {current.name}</title>
      </Helmet>

      <header className='arp-bar'>
        <div className='arp-bar-inner'>
          <button className='arp-nav' onClick={() => go(-1)} aria-label='Previous design'>
            <BiChevronLeft />
          </button>

          <div className='arp-meta'>
            <span className={`arp-badge ${badgeClass(current.group)}`}>
              {current.group}
            </span>
            <select
              className='arp-select'
              value={index}
              onChange={e => setIndex(Number(e.target.value))}
              aria-label='Choose a design variant'
            >
              {variantGroups.map(group => (
                <optgroup key={group} label={group}>
                  {variants
                    .filter(v => v.group === group)
                    .map(v => (
                      <option key={v.id} value={v.id - 1}>
                        {v.id}. {v.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <span className='arp-blurb'>{current.blurb}</span>
          </div>

          <div className='arp-count'>
            {current.id} / {variants.length}
          </div>

          <button className='arp-nav' onClick={() => go(1)} aria-label='Next design'>
            <BiChevronRight />
          </button>
        </div>
      </header>

      <main className='arp-stage'>
        <Variant />
      </main>
    </div>
  )
}

export default AccountRedesignPlayground
