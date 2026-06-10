import React, { FC, useState } from 'react'
import './RecipesSwitcher.scss'
import { TAKES } from './registry'
import { useRecipesTake, setRecipesTake, DEFAULT_TAKE } from './variantStore'

/**
 * Dev-only floating picker for flipping through the /recipes redesign takes.
 * Persists the choice in localStorage via the variant store; never rendered in
 * prod. Temporary scaffolding — remove with the losing takes once a winner is
 * picked (mirrors the desktop-nav redesign convention).
 */
const Switcher: FC = () => {
  const active = useRecipesTake()
  const [collapsed, setCollapsed] = useState(false)

  const groups = TAKES.reduce<Record<string, typeof TAKES>>((acc, t) => {
    ;(acc[t.group] ??= []).push(t)
    return acc
  }, {})

  const activeLabel =
    active === DEFAULT_TAKE
      ? 'Current page'
      : TAKES.find(t => t.id === active)?.label ?? active

  return (
    <div className={collapsed ? 'rcp-switcher is-collapsed' : 'rcp-switcher'}>
      <button
        type='button'
        className='rcp-switcher__head'
        onClick={() => setCollapsed(c => !c)}
      >
        <span className='rcp-switcher__title'>Recipes redesign</span>
        <span className='rcp-switcher__active'>{activeLabel}</span>
        <span className='rcp-switcher__chevron'>{collapsed ? '▴' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className='rcp-switcher__body'>
          <button
            type='button'
            className={
              active === DEFAULT_TAKE
                ? 'rcp-switcher__item is-active'
                : 'rcp-switcher__item'
            }
            onClick={() => setRecipesTake(DEFAULT_TAKE)}
          >
            <span className='rcp-switcher__item-label'>Current page</span>
            <span className='rcp-switcher__item-blurb'>The live production /recipes page</span>
          </button>

          {Object.entries(groups).map(([group, takes]) => (
            <div className='rcp-switcher__group' key={group}>
              <p className='rcp-switcher__group-heading'>
                {group}
                <span className='rcp-switcher__group-count'>{takes.length}</span>
              </p>
              {takes.map(t => (
                <button
                  type='button'
                  key={t.id}
                  className={
                    t.id === active
                      ? 'rcp-switcher__item is-active'
                      : 'rcp-switcher__item'
                  }
                  onClick={() => setRecipesTake(t.id)}
                >
                  <span className='rcp-switcher__item-label'>{t.label}</span>
                  <span className='rcp-switcher__item-blurb'>{t.blurb}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Dev-only guard kept out of the component so hooks aren't called conditionally. */
const RecipesSwitcher: FC = () =>
  import.meta.env.DEV ? <Switcher /> : null

export default RecipesSwitcher
