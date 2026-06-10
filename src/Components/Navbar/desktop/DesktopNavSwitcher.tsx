import React, { FC, useState } from 'react'
import './DesktopNavSwitcher.scss'
import { DESKTOP_VARIANTS } from './registry'
import { useDesktopVariant, setDesktopVariant } from './variantStore'
import { DROPDOWN_VARIANTS } from './dropdownRegistry'
import { useDesktopDropdown, setDesktopDropdown } from './dropdownStore'
import { CREATE_STYLES } from './createStore'
import { useDesktopCreateStyle, setDesktopCreateStyle } from './createStore'
import { AUTH_PREVIEWS } from './authPreviewStore'
import { useAuthPreview, setAuthPreview } from './authPreviewStore'

/**
 * Dev-only floating picker for flipping through desktop nav variants. Persists
 * the choice via the variant store (localStorage). Never rendered in prod.
 *
 * Temporary scaffolding for the redesign exploration — remove with the losing
 * variants once a winner is picked.
 */
const Switcher: FC = () => {
  const active = useDesktopVariant()
  const activeDropdown = useDesktopDropdown()
  const activeCreate = useDesktopCreateStyle()
  const activeAuth = useAuthPreview()
  const [collapsed, setCollapsed] = useState(false)

  // Group variants by their `group` label, preserving registry order.
  const groups = DESKTOP_VARIANTS.reduce<Record<string, typeof DESKTOP_VARIANTS>>(
    (acc, v) => {
      ;(acc[v.group] ??= []).push(v)
      return acc
    },
    {}
  )

  return (
    <div className={collapsed ? 'dnav-switcher is-collapsed' : 'dnav-switcher'}>
      <button
        type='button'
        className='dnav-switcher__head'
        onClick={() => setCollapsed(c => !c)}
      >
        <span>Nav: {active}</span>
        <span className='dnav-switcher__chevron'>{collapsed ? '▴' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className='dnav-switcher__body'>
          {Object.entries(groups).map(([group, variants]) => (
            <div className='dnav-switcher__group' key={group}>
              <p className='dnav-switcher__group-heading'>{group}</p>
              {variants.map(v => (
                <button
                  type='button'
                  key={v.id}
                  className={
                    v.id === active
                      ? 'dnav-switcher__item is-active'
                      : 'dnav-switcher__item'
                  }
                  onClick={() => setDesktopVariant(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ))}

          <div className='dnav-switcher__group dnav-switcher__group--divider'>
            <p className='dnav-switcher__group-heading'>
              Account dropdown <span className='dnav-switcher__hint'>(log in to see)</span>
            </p>
            {DROPDOWN_VARIANTS.map(d => (
              <button
                type='button'
                key={d.id}
                className={
                  d.id === activeDropdown
                    ? 'dnav-switcher__item is-active'
                    : 'dnav-switcher__item'
                }
                onClick={() => setDesktopDropdown(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className='dnav-switcher__group dnav-switcher__group--divider'>
            <p className='dnav-switcher__group-heading'>
              Create style <span className='dnav-switcher__hint'>(logged in)</span>
            </p>
            {CREATE_STYLES.map(c => (
              <button
                type='button'
                key={c.id}
                className={
                  c.id === activeCreate
                    ? 'dnav-switcher__item is-active'
                    : 'dnav-switcher__item'
                }
                onClick={() => setDesktopCreateStyle(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className='dnav-switcher__group dnav-switcher__group--divider'>
            <p className='dnav-switcher__group-heading'>
              Auth preview <span className='dnav-switcher__hint'>(no login)</span>
            </p>
            {AUTH_PREVIEWS.map(a => (
              <button
                type='button'
                key={a.id}
                className={
                  a.id === activeAuth
                    ? 'dnav-switcher__item is-active'
                    : 'dnav-switcher__item'
                }
                onClick={() => setAuthPreview(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Dev-only guard kept out of the component so hooks aren't called conditionally. */
const DesktopNavSwitcher: FC = () =>
  import.meta.env.DEV ? <Switcher /> : null

export default DesktopNavSwitcher
