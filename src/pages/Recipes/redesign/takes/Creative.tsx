import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineSearch, AiOutlineUser } from 'react-icons/ai'
import { BiChevronRight } from 'react-icons/bi'
import { RecipeType } from 'types'
import {
  useRecipeFilters,
  Stars,
  SaveButton,
  servingPrice,
  formatTime,
  prettyDiet,
  SORT_OPTIONS,
  CUISINES,
  MEALS,
  Filters,
} from '../shared'
import './Creative.scss'

const Search: FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}> = ({ value, onChange, placeholder = 'Search all recipes', className }) => (
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

const Sort: FC<{
  value: Filters['sort']
  onChange: (v: Filters['sort']) => void
}> = ({ value, onChange }) => (
  <select
    className='rp-bareselect'
    value={value}
    onChange={e => onChange(e.target.value as never)}
    aria-label='Sort recipes'
  >
    {SORT_OPTIONS.map(o => (
      <option key={o.value} value={o.value}>
        Sort: {o.label}
      </option>
    ))}
  </select>
)

/* -------------------------------------------------------------------------- */
/* X01 — Magazine / featured-first masonry                                    */
/* -------------------------------------------------------------------------- */
export const X01: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  const [feat, ...rest] = results
  return (
    <div className='rp-take x01'>
      <div className='x01-head'>
        <h1>Recipes</h1>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x01-grid'>
        {feat && (
          <a className='x01-feat' href='#' onClick={e => e.preventDefault()}>
            <img src={feat.recipeImage} alt={feat.title} />
            <div className='x01-feat__overlay'>
              <span className='x01-feat__badge'>Featured</span>
              <h2>{feat.title}</h2>
              <div className='x01-feat__meta'>
                <span>{servingPrice(feat)}/serving</span>
                <span>
                  <CgTimer /> {formatTime(feat.totalTime)}
                </span>
                <Stars value={feat.rating.rateValue} count={feat.rating.rateCount} />
              </div>
            </div>
            <SaveButton className='x01-feat__save' />
          </a>
        )}
        {rest.map(r => (
          <a key={r._id} className='x01-card' href='#' onClick={e => e.preventDefault()}>
            <div className='x01-card__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <span className='x01-card__price'>{servingPrice(r)}</span>
            </div>
            <h3>{r.title}</h3>
            <div className='x01-card__meta'>
              <span>
                <CgTimer /> {formatTime(r.totalTime)}
              </span>
              <Stars value={r.rating.rateValue} size={12} />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X02 — List view (rows) with grid/list toggle                              */
/* -------------------------------------------------------------------------- */
export const X02: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  const [view, setView] = useState<'list' | 'grid'>('list')
  return (
    <div className='rp-take x02'>
      <div className='x02-head'>
        <h1>Recipes</h1>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <div className='x02-toolbar'>
          <Sort value={filters.sort} onChange={s => update({ sort: s })} />
          <div className='x02-toggle'>
            <button
              className={view === 'list' ? 'is-active' : ''}
              onClick={() => setView('list')}
              aria-label='List view'
            >
              ☰
            </button>
            <button
              className={view === 'grid' ? 'is-active' : ''}
              onClick={() => setView('grid')}
              aria-label='Grid view'
            >
              ▦
            </button>
          </div>
        </div>
      </div>
      <div className={view === 'list' ? 'x02-list' : 'x02-asgrid'}>
        {results.map(r => (
          <a key={r._id} className='x02-row' href='#' onClick={e => e.preventDefault()}>
            <img src={r.recipeImage} alt={r.title} loading='lazy' />
            <div className='x02-row__body'>
              <div className='x02-row__top'>
                <h3>{r.title}</h3>
                <SaveButton />
              </div>
              <div className='x02-row__tags'>
                <span className='x02-row__cuisine'>{r.cuisine}</span>
                {(r.nutritionLabels ?? []).slice(0, 3).map(d => (
                  <span key={d} className='x02-row__diet'>
                    {prettyDiet(d)}
                  </span>
                ))}
              </div>
              <div className='x02-row__meta'>
                <span>
                  <CgTimer /> {formatTime(r.totalTime)}
                </span>
                <span>
                  <AiOutlineUser /> {r.servings} servings
                </span>
                <Stars value={r.rating.rateValue} count={r.rating.rateCount} />
                <span className='x02-row__price'>{servingPrice(r)}/serving</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X03 — Pinterest masonry (variable heights, minimal chrome)                 */
/* -------------------------------------------------------------------------- */
export const X03: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  // Deterministic pseudo-random height per card for the masonry feel.
  const ratios = ['3 / 4', '1 / 1', '4 / 5', '4 / 3', '3 / 4', '1 / 1']
  return (
    <div className='rp-take x03'>
      <div className='x03-head'>
        <Search
          value={filters.query}
          onChange={q => update({ query: q })}
          className='x03-search'
        />
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x03-masonry'>
        {results.map((r, i) => (
          <a key={r._id} className='x03-pin' href='#' onClick={e => e.preventDefault()}>
            <div className='x03-pin__img' style={{ aspectRatio: ratios[i % ratios.length] }}>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <SaveButton className='x03-pin__save' />
              <span className='x03-pin__price'>{servingPrice(r)}</span>
            </div>
            <h3>{r.title}</h3>
            <div className='x03-pin__meta'>
              <CgTimer /> {formatTime(r.totalTime)} · {r.cuisine}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X04 — Hero spotlight + grid                                                */
/* -------------------------------------------------------------------------- */
export const X04: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  const hero = results[0]
  return (
    <div className='rp-take x04'>
      {hero && (
        <a className='x04-hero' href='#' onClick={e => e.preventDefault()}>
          <img src={hero.recipeImage} alt={hero.title} />
          <div className='x04-hero__content'>
            <span className='x04-hero__eyebrow'>Recipe of the week</span>
            <h1>{hero.title}</h1>
            <p>{hero.description}</p>
            <div className='x04-hero__meta'>
              <span>{servingPrice(hero)}/serving</span>
              <span>
                <CgTimer /> {formatTime(hero.totalTime)}
              </span>
              <Stars value={hero.rating.rateValue} count={hero.rating.rateCount} />
            </div>
            <span className='x04-hero__cta'>
              View recipe <BiChevronRight />
            </span>
          </div>
        </a>
      )}
      <div className='x04-bar'>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x04-grid'>
        {results.slice(1).map(r => (
          <a key={r._id} className='x04-card' href='#' onClick={e => e.preventDefault()}>
            <div className='x04-card__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <span className='x04-card__price'>{servingPrice(r)}/serving</span>
            </div>
            <h3>{r.title}</h3>
            <div className='x04-card__meta'>
              <span>
                <CgTimer /> {formatTime(r.totalTime)}
              </span>
              <Stars value={r.rating.rateValue} size={12} />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X05 — Dark gourmet                                                         */
/* -------------------------------------------------------------------------- */
export const X05: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take x05'>
      <div className='x05-shell'>
        <header className='x05-head'>
          <h1>Explore Recipes</h1>
          <Search value={filters.query} onChange={q => update({ query: q })} />
        </header>
        <div className='x05-bar'>
          <span className='rp-result-count'>{results.length} recipes</span>
          <Sort value={filters.sort} onChange={s => update({ sort: s })} />
        </div>
        <div className='x05-grid'>
          {results.map(r => (
            <a key={r._id} className='x05-card' href='#' onClick={e => e.preventDefault()}>
              <div className='x05-card__thumb'>
                <img src={r.recipeImage} alt={r.title} loading='lazy' />
                <SaveButton className='x05-card__save' />
              </div>
              <div className='x05-card__body'>
                <h3>{r.title}</h3>
                <div className='x05-card__meta'>
                  <span>
                    <CgTimer /> {formatTime(r.totalTime)}
                  </span>
                  <Stars value={r.rating.rateValue} count={r.rating.rateCount} />
                </div>
                <div className='x05-card__price'>{servingPrice(r)} / serving</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X06 — Filter drawer + toolbar (Airbnb-style)                               */
/* -------------------------------------------------------------------------- */
export const X06: FC = () => {
  const { filters, update, reset, toggleDiet, results, activeCount } =
    useRecipeFilters()
  const [open, setOpen] = useState(false)
  const diets = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein', 'Low-Carb', 'Low-Fat']
  return (
    <div className='rp-take x06'>
      <h1 className='x06-title'>Recipes</h1>
      <div className='x06-toolbar'>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <button className='x06-filterbtn' onClick={() => setOpen(true)}>
          ⚙ Filters{activeCount ? ` · ${activeCount}` : ''}
        </button>
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x06-count'>
        <span className='rp-result-count'>{results.length} recipes</span>
        {activeCount > 0 && (
          <button className='x06-clear' onClick={reset}>
            Clear filters
          </button>
        )}
      </div>
      <div className='x06-grid'>
        {results.map(r => (
          <a key={r._id} className='x06-card' href='#' onClick={e => e.preventDefault()}>
            <div className='x06-card__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <SaveButton className='x06-card__save' />
            </div>
            <h3>{r.title}</h3>
            <div className='x06-card__meta'>
              <Stars value={r.rating.rateValue} count={r.rating.rateCount} />
              <span>{servingPrice(r)}</span>
            </div>
          </a>
        ))}
      </div>

      {open && (
        <div className='x06-drawer' role='dialog' aria-label='Filters'>
          <div className='x06-drawer__backdrop' onClick={() => setOpen(false)} />
          <div className='x06-drawer__panel'>
            <div className='x06-drawer__head'>
              <h2>Filters</h2>
              <button onClick={() => setOpen(false)} aria-label='Close'>
                ✕
              </button>
            </div>
            <div className='x06-drawer__body'>
              <section>
                <h4>Diet</h4>
                <div className='x06-drawer__chips'>
                  {diets.map(d => (
                    <button
                      key={d}
                      className={`rp-chip ${filters.diets.includes(d) ? 'is-active' : ''}`}
                      onClick={() => toggleDiet(d)}
                    >
                      {prettyDiet(d)}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h4>Cuisine</h4>
                <div className='x06-drawer__chips'>
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
                <div className='x06-drawer__chips'>
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
            <div className='x06-drawer__foot'>
              <button className='x06-drawer__reset' onClick={reset}>
                Reset
              </button>
              <button className='x06-drawer__apply' onClick={() => setOpen(false)}>
                Show {results.length} recipes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X07 — Faceted rail with live counts                                        */
/* -------------------------------------------------------------------------- */
export const X07: FC = () => {
  const { filters, update, reset, toggleDiet, results } = useRecipeFilters()
  const diets = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein', 'Low-Carb']
  const countFor = (d: string) =>
    results.filter(r => (r.nutritionLabels ?? []).includes(d)).length
  return (
    <div className='rp-take x07'>
      <div className='x07-layout'>
        <aside className='x07-rail'>
          <h1>Recipes</h1>
          <Search value={filters.query} onChange={q => update({ query: q })} />
          <div className='x07-facet'>
            <h4>Dietary</h4>
            {diets.map(d => (
              <label key={d} className='x07-facet__row'>
                <span>
                  <input
                    type='checkbox'
                    checked={filters.diets.includes(d)}
                    onChange={() => toggleDiet(d)}
                  />
                  {prettyDiet(d)}
                </span>
                <em>{countFor(d)}</em>
              </label>
            ))}
          </div>
          <div className='x07-facet'>
            <h4>Cuisine</h4>
            {CUISINES.map(c => (
              <label key={c} className='x07-facet__row'>
                <span>
                  <input
                    type='radio'
                    name='x07-cuisine'
                    checked={filters.cuisine === c}
                    onChange={() => update({ cuisine: c })}
                  />
                  {c}
                </span>
              </label>
            ))}
          </div>
          <button className='x07-reset' onClick={reset}>
            Clear all
          </button>
        </aside>
        <div className='x07-main'>
          <div className='x07-bar'>
            <span className='rp-result-count'>{results.length} results</span>
            <Sort value={filters.sort} onChange={s => update({ sort: s })} />
          </div>
          <div className='x07-grid'>
            {results.map(r => (
              <a key={r._id} className='x07-card' href='#' onClick={e => e.preventDefault()}>
                <div className='x07-card__thumb'>
                  <img src={r.recipeImage} alt={r.title} loading='lazy' />
                  <span className='x07-card__price'>{servingPrice(r)}/serving</span>
                </div>
                <h3>{r.title}</h3>
                <div className='x07-card__meta'>
                  <span>
                    <CgTimer /> {formatTime(r.totalTime)}
                  </span>
                  <Stars value={r.rating.rateValue} size={12} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X08 — Immersive full-bleed overlay cards                                   */
/* -------------------------------------------------------------------------- */
export const X08: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take x08'>
      <div className='x08-head'>
        <h1>Recipes</h1>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x08-grid'>
        {results.map(r => (
          <a
            key={r._id}
            className='x08-card'
            href='#'
            onClick={e => e.preventDefault()}
            style={{ backgroundImage: `url(${r.recipeImage})` }}
          >
            <SaveButton className='x08-card__save' />
            <div className='x08-card__shade'>
              <span className='x08-card__cuisine'>{r.cuisine}</span>
              <h3>{r.title}</h3>
              <div className='x08-card__meta'>
                <span>{servingPrice(r)}/serving</span>
                <span>
                  <CgTimer /> {formatTime(r.totalTime)}
                </span>
                <span>★ {r.rating.rateValue.toFixed(1)}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X09 — Tabbed collections (curated lenses)                                   */
/* -------------------------------------------------------------------------- */
const COLLECTIONS: {
  id: string
  label: string
  apply: (r: RecipeType) => boolean
}[] = [
  { id: 'all', label: 'All', apply: () => true },
  { id: 'quick', label: 'Quick & Easy', apply: r => r.totalTime <= 30 },
  { id: 'budget', label: 'Under $2.50', apply: r => (r.servingPrice ?? 0) <= 250 },
  {
    id: 'protein',
    label: 'High Protein',
    apply: r => (r.nutritionLabels ?? []).includes('High-Protein'),
  },
  {
    id: 'vegan',
    label: 'Vegan',
    apply: r => (r.nutritionLabels ?? []).includes('VEGAN'),
  },
]

export const X09: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  const [tab, setTab] = useState('all')
  const active = COLLECTIONS.find(c => c.id === tab) ?? COLLECTIONS[0]
  const list = results.filter(active.apply)
  return (
    <div className='rp-take x09'>
      <h1 className='x09-title'>Recipe collections</h1>
      <Search value={filters.query} onChange={q => update({ query: q })} />
      <div className='x09-tabs' role='tablist'>
        {COLLECTIONS.map(c => (
          <button
            key={c.id}
            role='tab'
            aria-selected={tab === c.id}
            className={tab === c.id ? 'is-active' : ''}
            onClick={() => setTab(c.id)}
          >
            {c.label}
          </button>
        ))}
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <p className='rp-result-count x09-count'>{list.length} recipes</p>
      <div className='x09-grid'>
        {list.map(r => (
          <a key={r._id} className='x09-card' href='#' onClick={e => e.preventDefault()}>
            <div className='x09-card__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <span className='x09-card__price'>{servingPrice(r)}</span>
            </div>
            <h3>{r.title}</h3>
            <div className='x09-card__meta'>
              <span>
                <CgTimer /> {formatTime(r.totalTime)}
              </span>
              <Stars value={r.rating.rateValue} size={12} />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* X10 — Bento / mixed tiles                                                  */
/* -------------------------------------------------------------------------- */
export const X10: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  // Tile sizes cycle to build a bento rhythm: big, small, small, wide...
  const sizes = ['big', 'sm', 'sm', 'wide', 'sm', 'sm', 'tall', 'sm']
  return (
    <div className='rp-take x10'>
      <div className='x10-head'>
        <h1>Recipes</h1>
        <Search value={filters.query} onChange={q => update({ query: q })} />
        <Sort value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='x10-bento'>
        {results.map((r, i) => (
          <a
            key={r._id}
            className={`x10-tile x10-tile--${sizes[i % sizes.length]}`}
            href='#'
            onClick={e => e.preventDefault()}
            style={{ backgroundImage: `url(${r.recipeImage})` }}
          >
            <div className='x10-tile__shade'>
              <h3>{r.title}</h3>
              <div className='x10-tile__meta'>
                <span>{servingPrice(r)}/serving</span>
                <span>
                  <CgTimer /> {formatTime(r.totalTime)}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
