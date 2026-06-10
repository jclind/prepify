import React, { FC, useState, useRef, useEffect, ReactNode } from 'react'
import { AiOutlineSearch } from 'react-icons/ai'
import { BiChevronDown, BiSliderAlt } from 'react-icons/bi'
import { RecipeType } from 'types'
import { dietLabelsOptions } from 'src/recipeData/dietLabels'
import {
  useRecipeFilters,
  prettyDiet,
  SORT_OPTIONS,
  CUISINES,
  MEALS,
  Filters,
} from '../shared'
import { PolishedCard } from './Conservative'
import './PolishedControls.scss'

/* -------------------------------------------------------------------------- *
 * Five control treatments for the winning "Polished Grid". Same card grid in
 * every one; what changes is how filtering + sorting are surfaced. No result
 * count anywhere (deliberately omitted for launch).
 * -------------------------------------------------------------------------- */

const DIET_QUICK = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein', 'Low-Carb']

/* ---- shared primitives --------------------------------------------------- */

const Search: FC<{
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
}> = ({ value, onChange, className, placeholder = 'Search all recipes' }) => (
  <label className={`rp-search ${className ?? ''}`}>
    <AiOutlineSearch className='rp-search__icon' />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label='Search recipes'
    />
  </label>
)

/** Click-outside-aware dropdown anchored under a trigger button. */
const Menu: FC<{
  label: ReactNode
  active?: boolean
  align?: 'left' | 'right'
  variant?: 'pill' | 'plain'
  children: (close: () => void) => ReactNode
}> = ({ label, active, align = 'left', variant = 'pill', children }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  return (
    <div className='pg-menu' ref={ref}>
      <button
        type='button'
        className={`pg-trigger pg-trigger--${variant} ${active ? 'is-active' : ''} ${
          open ? 'is-open' : ''
        }`}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {label}
        <BiChevronDown className='pg-trigger__chev' />
      </button>
      {open && (
        <div className={`pg-panel pg-panel--${align}`}>{children(() => setOpen(false))}</div>
      )}
    </div>
  )
}

const DietMenu: FC<{
  selected: string[]
  onToggle: (v: string) => void
}> = ({ selected, onToggle }) => (
  <Menu
    label={selected.length ? `Diet · ${selected.length}` : 'Diet'}
    active={selected.length > 0}
  >
    {() => (
      <ul className='pg-checklist'>
        {dietLabelsOptions.map(o => (
          <li key={o.value}>
            <label>
              <input
                type='checkbox'
                checked={selected.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              {o.label}
            </label>
          </li>
        ))}
      </ul>
    )}
  </Menu>
)

const ChoiceMenu: FC<{
  label: string
  value: string
  options: string[]
  allLabel: string
  onChange: (v: string) => void
}> = ({ label, value, options, allLabel, onChange }) => (
  <Menu label={value || label} active={!!value}>
    {close => (
      <ul className='pg-radiolist'>
        <li>
          <button
            className={!value ? 'is-active' : ''}
            onClick={() => {
              onChange('')
              close()
            }}
          >
            {allLabel}
          </button>
        </li>
        {options.map(o => (
          <li key={o}>
            <button
              className={value === o ? 'is-active' : ''}
              onClick={() => {
                onChange(o)
                close()
              }}
            >
              {o}
            </button>
          </li>
        ))}
      </ul>
    )}
  </Menu>
)

const SortMenu: FC<{
  value: Filters['sort']
  onChange: (v: Filters['sort']) => void
  align?: 'left' | 'right'
  variant?: 'pill' | 'plain'
}> = ({ value, onChange, align = 'right', variant = 'pill' }) => {
  const current = SORT_OPTIONS.find(o => o.value === value)?.label
  return (
    <Menu label={`Sort: ${current}`} align={align} variant={variant}>
      {close => (
        <ul className='pg-radiolist'>
          {SORT_OPTIONS.map(o => (
            <li key={o.value}>
              <button
                className={value === o.value ? 'is-active' : ''}
                onClick={() => {
                  onChange(o.value)
                  close()
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Menu>
  )
}

const Grid: FC<{
  results: RecipeType[]
  onReset: () => void
  compactRating?: boolean
}> = ({ results, onReset, compactRating }) =>
  results.length ? (
    <div className='pg-grid'>
      {results.map(r => (
        <PolishedCard key={r._id} r={r} compactRating={compactRating} />
      ))}
    </div>
  ) : (
    <div className='rp-empty'>
      <div className='rp-empty__emoji'>🍽️</div>
      <h3>No recipes match those filters</h3>
      <p>Try removing a filter or searching for something else.</p>
      <button onClick={onReset}>Clear filters</button>
    </div>
  )

const ActiveChips: FC<{
  filters: Filters
  onToggleDiet: (v: string) => void
  onClearCuisine: () => void
  onClearMeal: () => void
  onClearAll: () => void
}> = ({ filters, onToggleDiet, onClearCuisine, onClearMeal, onClearAll }) => {
  const has = filters.diets.length || filters.cuisine || filters.meal
  if (!has) return null
  return (
    <div className='pg-active'>
      {filters.cuisine && (
        <button className='pg-active__chip' onClick={onClearCuisine}>
          {filters.cuisine} ✕
        </button>
      )}
      {filters.meal && (
        <button className='pg-active__chip' onClick={onClearMeal}>
          {filters.meal} ✕
        </button>
      )}
      {filters.diets.map(d => (
        <button key={d} className='pg-active__chip' onClick={() => onToggleDiet(d)}>
          {prettyDiet(d)} ✕
        </button>
      ))}
      <button className='pg-active__clear' onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}

const Head: FC = () => (
  <header className='pg-head'>
    <h1>Recipes</h1>
    <p>Healthy, budget-friendly meals with real prices per serving.</p>
  </header>
)

/* -------------------------------------------------------------------------- *
 * G01 — Popover pills. Each filter is a quiet pill that opens a popover;
 * active pills fill orange. Search on its own line. Everything visible, no
 * sidebar, no drawer.
 * -------------------------------------------------------------------------- */
export const G01: FC = () => {
  const { filters, update, reset, toggleDiet, results, activeCount } =
    useRecipeFilters()
  return (
    <div className='rp-take pg pg01'>
      <Head />
      <Search value={filters.query} onChange={q => update({ query: q })} className='pg-search-wide' />
      <div className='pg-toolbar'>
        <div className='pg-toolbar__filters'>
          <DietMenu selected={filters.diets} onToggle={toggleDiet} />
          <ChoiceMenu
            label='Cuisine'
            value={filters.cuisine}
            options={CUISINES}
            allLabel='All cuisines'
            onChange={c => update({ cuisine: c })}
          />
          <ChoiceMenu
            label='Meal'
            value={filters.meal}
            options={MEALS}
            allLabel='Any meal'
            onChange={m => update({ meal: m })}
          />
          {activeCount > 0 && (
            <button className='pg-clear-inline' onClick={reset}>
              Clear
            </button>
          )}
        </div>
        <SortMenu value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <Grid results={results} onReset={reset} />
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * G02 — Unified command bar. Search + filters + sort live in ONE rounded
 * surface (kills the redundant second search). Active filters as chips below.
 * -------------------------------------------------------------------------- */
export const G02: FC = () => {
  const { filters, update, reset, toggleDiet, results } = useRecipeFilters()
  return (
    <div className='rp-take pg pg02'>
      <Head />
      <div className='pg-cmd'>
        <label className='pg-cmd__search'>
          <AiOutlineSearch className='pg-cmd__icon' />
          <input
            value={filters.query}
            onChange={e => update({ query: e.target.value })}
            placeholder='Search all recipes'
            aria-label='Search recipes'
          />
        </label>
        <span className='pg-cmd__divide' />
        <DietMenu selected={filters.diets} onToggle={toggleDiet} />
        <ChoiceMenu
          label='Cuisine'
          value={filters.cuisine}
          options={CUISINES}
          allLabel='All cuisines'
          onChange={c => update({ cuisine: c })}
        />
        <span className='pg-cmd__divide' />
        <SortMenu value={filters.sort} onChange={s => update({ sort: s })} variant='plain' />
      </div>
      <ActiveChips
        filters={filters}
        onToggleDiet={toggleDiet}
        onClearCuisine={() => update({ cuisine: '' })}
        onClearMeal={() => update({ meal: '' })}
        onClearAll={reset}
      />
      <Grid results={results} onReset={reset} />
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * G03 — Category chips (discovery-first). One-tap quick filters in a scroll
 * rail; the long tail lives behind a Sort pill. Optimised for browsing.
 * -------------------------------------------------------------------------- */
export const G03: FC = () => {
  const { filters, update, reset, toggleDiet, results } = useRecipeFilters()
  const noFilter = !filters.diets.length && !filters.cuisine && !filters.meal
  return (
    <div className='rp-take pg pg03'>
      <Head />
      <Search value={filters.query} onChange={q => update({ query: q })} className='pg-search-wide' />
      <div className='pg-chipbar'>
        <div className='pg-chiprail'>
          <button
            className={`rp-chip ${noFilter ? 'is-active' : ''}`}
            onClick={reset}
          >
            All
          </button>
          <button
            className={`rp-chip ${filters.meal === 'Quick' ? 'is-active' : ''}`}
            onClick={() => update({ meal: filters.meal === 'Quick' ? '' : 'Quick' })}
          >
            Quick &amp; Easy
          </button>
          {DIET_QUICK.map(d => (
            <button
              key={d}
              className={`rp-chip ${filters.diets.includes(d) ? 'is-active' : ''}`}
              onClick={() => toggleDiet(d)}
            >
              {prettyDiet(d)}
            </button>
          ))}
          {CUISINES.map(c => (
            <button
              key={c}
              className={`rp-chip ${filters.cuisine === c ? 'is-active' : ''}`}
              onClick={() => update({ cuisine: filters.cuisine === c ? '' : c })}
            >
              {c}
            </button>
          ))}
        </div>
        <SortMenu value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <Grid results={results} onReset={reset} />
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * G04 — Quiet left rail. Persistent, understated facets (no heavy chrome) so
 * power filtering is always one glance away. Grid keeps full width on mobile.
 * -------------------------------------------------------------------------- */
export const G04: FC = () => {
  const { filters, update, reset, toggleDiet, results, activeCount } =
    useRecipeFilters()
  return (
    <div className='rp-take pg pg04'>
      <Head />
      <div className='pg04-layout'>
        <aside className='pg04-rail' aria-label='Filters'>
          <Search value={filters.query} onChange={q => update({ query: q })} />
          <div className='pg04-group'>
            <h4>Sort</h4>
            <select
              value={filters.sort}
              onChange={e => update({ sort: e.target.value as never })}
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className='pg04-group'>
            <h4>Diet</h4>
            <ul className='pg04-checks'>
              {DIET_QUICK.concat(['Low-Fat', 'Low-Sodium']).map(d => (
                <li key={d}>
                  <label>
                    <input
                      type='checkbox'
                      checked={filters.diets.includes(d)}
                      onChange={() => toggleDiet(d)}
                    />
                    {prettyDiet(d)}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <div className='pg04-group'>
            <h4>Cuisine</h4>
            <select
              value={filters.cuisine}
              onChange={e => update({ cuisine: e.target.value })}
            >
              <option value=''>All cuisines</option>
              {CUISINES.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {activeCount > 0 && (
            <button className='pg04-clear' onClick={reset}>
              Clear filters
            </button>
          )}
        </aside>
        <div className='pg04-main'>
          <Grid results={results} onReset={reset} />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * G05 — Minimal toolbar + filter drawer. Toolbar shows only Search, a Filters
 * button (with active count) and Sort; everything else slides in. Active
 * filters echo as removable chips. Cleanest top, full power on demand.
 * -------------------------------------------------------------------------- */
const PER_PAGE = 8

/** G05 body, parametrised by rating style so G06 can reuse it verbatim. */
const G05Base: FC<{ compactRating?: boolean }> = ({ compactRating }) => {
  const { filters, update, reset, toggleDiet, results, activeCount } =
    useRecipeFilters()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(PER_PAGE)
  return (
    <div className='rp-take pg pg05'>
      <Head />
      <div className='pg05-toolbar'>
        <Search value={filters.query} onChange={q => update({ query: q })} className='pg05-search' />
        <button className='pg05-filterbtn' onClick={() => setOpen(true)}>
          <BiSliderAlt /> Filters
          {activeCount > 0 && <span className='pg05-badge'>{activeCount}</span>}
        </button>
        <SortMenu value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <ActiveChips
        filters={filters}
        onToggleDiet={toggleDiet}
        onClearCuisine={() => update({ cuisine: '' })}
        onClearMeal={() => update({ meal: '' })}
        onClearAll={reset}
      />
      <Grid
        results={results.slice(0, visible)}
        onReset={reset}
        compactRating={compactRating}
      />
      {visible < results.length && (
        <div className='pg-loadmore'>
          <button onClick={() => setVisible(v => v + PER_PAGE)}>
            Load more recipes <BiChevronDown />
          </button>
        </div>
      )}

      {open && (
        <div className='pg05-drawer' role='dialog' aria-label='Filters'>
          <div className='pg05-drawer__backdrop' onClick={() => setOpen(false)} />
          <div className='pg05-drawer__panel'>
            <div className='pg05-drawer__head'>
              <h2>Filters</h2>
              <button onClick={() => setOpen(false)} aria-label='Close'>
                ✕
              </button>
            </div>
            <div className='pg05-drawer__body'>
              <section>
                <h4>Diet</h4>
                <div className='pg05-drawer__chips'>
                  {dietLabelsOptions.map(o => (
                    <button
                      key={o.value}
                      className={`rp-chip ${filters.diets.includes(o.value) ? 'is-active' : ''}`}
                      onClick={() => toggleDiet(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h4>Cuisine</h4>
                <div className='pg05-drawer__chips'>
                  {CUISINES.map(c => (
                    <button
                      key={c}
                      className={`rp-chip ${filters.cuisine === c ? 'is-active' : ''}`}
                      onClick={() => update({ cuisine: filters.cuisine === c ? '' : c })}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h4>Meal</h4>
                <div className='pg05-drawer__chips'>
                  {MEALS.map(m => (
                    <button
                      key={m}
                      className={`rp-chip ${filters.meal === m ? 'is-active' : ''}`}
                      onClick={() => update({ meal: filters.meal === m ? '' : m })}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <div className='pg05-drawer__foot'>
              <button className='pg05-drawer__reset' onClick={reset}>
                Reset
              </button>
              <button className='pg05-drawer__apply' onClick={() => setOpen(false)}>
                Show recipes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** G05 — full 5-star rating on each card. */
export const G05: FC = () => <G05Base />

/** G06 — identical to G05 but with the compact single-star rating. */
export const G06: FC = () => <G05Base compactRating />
