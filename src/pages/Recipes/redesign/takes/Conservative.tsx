import React, { FC } from 'react'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineSearch } from 'react-icons/ai'
import { RecipeType } from 'types'
import {
  useRecipeFilters,
  Stars,
  RatingCompact,
  SaveButton,
  servingPrice,
  recipePrice,
  formatTime,
  prettyDiet,
  SORT_OPTIONS,
  CUISINES,
  MEALS,
  Filters,
} from '../shared'
import './Conservative.scss'

/* -------------------------------------------------------------------------- */
/* Shared bits for the conservative (polish & refine) takes                   */
/* -------------------------------------------------------------------------- */

const SearchBar: FC<{
  value: string
  onChange: (v: string) => void
  placeholder?: string
}> = ({ value, onChange, placeholder = 'Search all recipes' }) => (
  <label className='rp-search'>
    <AiOutlineSearch className='rp-search__icon' />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label='Search recipes'
    />
  </label>
)

const SortSelect: FC<{
  value: Filters['sort']
  onChange: (v: Filters['sort']) => void
}> = ({ value, onChange }) => (
  <label className='rp-select'>
    <span>Sort</span>
    <select value={value} onChange={e => onChange(e.target.value as never)}>
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
)

// Home-style refined card, used (with modifiers) by several conservative takes
// and by the Polished-Controls (G) variants.
export const PolishedCard: FC<{
  r: RecipeType
  modifier?: string
  /** Use the single-star rating instead of the full 5-star display. */
  compactRating?: boolean
}> = ({ r, modifier = '', compactRating = false }) => (
  <a className={`pcard ${modifier}`} href='#' onClick={e => e.preventDefault()}>
    <div className='pcard__thumb'>
      <img src={r.recipeImage} alt={r.title} loading='lazy' />
      <span className='pcard__price'>{servingPrice(r)}/serving</span>
      <SaveButton className='pcard__save' />
    </div>
    <div className='pcard__body'>
      <span className='pcard__cuisine'>{r.cuisine}</span>
      <h3>{r.title}</h3>
      <div className='pcard__meta'>
        <span>
          <CgTimer /> {formatTime(r.totalTime)}
        </span>
        {compactRating ? (
          <RatingCompact value={r.rating.rateValue} count={r.rating.rateCount} />
        ) : (
          <Stars value={r.rating.rateValue} count={r.rating.rateCount} />
        )}
      </div>
    </div>
  </a>
)

const ResultCount: FC<{ n: number }> = ({ n }) => (
  <p className='rp-result-count'>
    {n} {n === 1 ? 'recipe' : 'recipes'}
  </p>
)

const EmptyState: FC<{ onReset: () => void }> = ({ onReset }) => (
  <div className='rp-empty'>
    <div className='rp-empty__emoji'>🍽️</div>
    <h3>No recipes match those filters</h3>
    <p>Try removing a filter or searching for something else.</p>
    <button onClick={onReset}>Clear all filters</button>
  </div>
)

/* -------------------------------------------------------------------------- */
/* C01 — Polished Grid: Home-card styling + result count                      */
/* -------------------------------------------------------------------------- */
export const C01: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take c01'>
      <header className='c01-head'>
        <h1>Recipes</h1>
        <p>Healthy, budget-friendly meals with real prices per serving.</p>
      </header>
      <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      <div className='c01-bar c01-bar--sort-only'>
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='c01-grid'>
        {results.map(r => (
          <PolishedCard key={r._id} r={r} />
        ))}
      </div>
      <div className='rp-load-more'>
        <button>Load more recipes</button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C02 — Filter Chips: removable active-filter chips + clear all              */
/* -------------------------------------------------------------------------- */
export const C02: FC = () => {
  const { filters, update, reset, toggleDiet, results, activeCount } =
    useRecipeFilters()
  const dietChips = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein', 'Low-Carb']
  return (
    <div className='rp-take c02'>
      <h1 className='c02-title'>Recipes</h1>
      <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      <div className='c02-chiprow'>
        {dietChips.map(d => (
          <button
            key={d}
            className={`rp-chip ${filters.diets.includes(d) ? 'is-active' : ''}`}
            onClick={() => toggleDiet(d)}
          >
            {prettyDiet(d)}
          </button>
        ))}
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      {activeCount > 0 && (
        <div className='c02-active'>
          {filters.diets.map(d => (
            <button key={d} className='c02-active__chip' onClick={() => toggleDiet(d)}>
              {prettyDiet(d)} ✕
            </button>
          ))}
          <button className='c02-active__clear' onClick={reset}>
            Clear all
          </button>
        </div>
      )}
      <ResultCount n={results.length} />
      <div className='c02-grid'>
        {results.length ? (
          results.map(r => <PolishedCard key={r._id} r={r} />)
        ) : (
          <EmptyState onReset={reset} />
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C03 — Sidebar Filters: left rail + grid (classic browse)                   */
/* -------------------------------------------------------------------------- */
export const C03: FC = () => {
  const { filters, update, reset, toggleDiet, results } = useRecipeFilters()
  const diets = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein', 'Low-Carb', 'Low-Fat']
  return (
    <div className='rp-take c03'>
      <h1 className='c03-title'>Recipes</h1>
      <div className='c03-layout'>
        <aside className='c03-rail' aria-label='Filters'>
          <div className='c03-group'>
            <h4>Search</h4>
            <SearchBar value={filters.query} onChange={q => update({ query: q })} />
          </div>
          <div className='c03-group'>
            <h4>Sort by</h4>
            <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
          </div>
          <div className='c03-group'>
            <h4>Diet</h4>
            <ul>
              {diets.map(d => (
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
          <div className='c03-group'>
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
          <button className='c03-reset' onClick={reset}>
            Reset filters
          </button>
        </aside>
        <div className='c03-main'>
          <ResultCount n={results.length} />
          <div className='c03-grid'>
            {results.length ? (
              results.map(r => <PolishedCard key={r._id} r={r} />)
            ) : (
              <EmptyState onReset={reset} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C04 — Segmented Sort + prominent count                                     */
/* -------------------------------------------------------------------------- */
export const C04: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  const quick: Filters['sort'][] = ['popular', 'new', 'cheapest', 'shortest']
  return (
    <div className='rp-take c04'>
      <div className='c04-head'>
        <div>
          <h1>Recipes</h1>
          <ResultCount n={results.length} />
        </div>
        <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      </div>
      <div className='c04-segment' role='tablist'>
        {quick.map(s => (
          <button
            key={s}
            role='tab'
            aria-selected={filters.sort === s}
            className={filters.sort === s ? 'is-active' : ''}
            onClick={() => update({ sort: s })}
          >
            {SORT_OPTIONS.find(o => o.value === s)?.label}
          </button>
        ))}
      </div>
      <div className='c04-grid'>
        {results.map(r => (
          <PolishedCard key={r._id} r={r} />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C05 — Quick Category Chips rail                                            */
/* -------------------------------------------------------------------------- */
export const C05: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take c05'>
      <h1 className='c05-title'>Recipes</h1>
      <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      <div className='c05-rail'>
        <button
          className={`rp-chip ${!filters.meal && !filters.cuisine ? 'is-active' : ''}`}
          onClick={() => update({ meal: '', cuisine: '' })}
        >
          All
        </button>
        {MEALS.map(m => (
          <button
            key={m}
            className={`rp-chip ${filters.meal === m ? 'is-active' : ''}`}
            onClick={() => update({ meal: filters.meal === m ? '' : m })}
          >
            {m}
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
      <div className='c05-bar'>
        <ResultCount n={results.length} />
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='c05-grid'>
        {results.map(r => (
          <PolishedCard key={r._id} r={r} />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C06 — Compact Dense Grid for power browsing                                */
/* -------------------------------------------------------------------------- */
export const C06: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take c06'>
      <div className='c06-head'>
        <h1>Recipes</h1>
        <SearchBar value={filters.query} onChange={q => update({ query: q })} />
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <ResultCount n={results.length} />
      <div className='c06-grid'>
        {results.map(r => (
          <a key={r._id} className='ccard' href='#' onClick={e => e.preventDefault()}>
            <div className='ccard__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <span className='ccard__price'>{servingPrice(r)}</span>
            </div>
            <h3>{r.title}</h3>
            <div className='ccard__meta'>
              <span>
                <CgTimer /> {r.totalTime}m
              </span>
              <Stars value={r.rating.rateValue} size={11} />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C07 — Tagged cards (cuisine + diet pills on the card)                      */
/* -------------------------------------------------------------------------- */
export const C07: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take c07'>
      <h1 className='c07-title'>Recipes</h1>
      <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      <div className='c07-bar'>
        <ResultCount n={results.length} />
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='c07-grid'>
        {results.map(r => (
          <a key={r._id} className='tcard' href='#' onClick={e => e.preventDefault()}>
            <div className='tcard__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
              <SaveButton className='tcard__save' />
            </div>
            <div className='tcard__body'>
              <div className='tcard__tags'>
                <span className='tcard__cuisine'>{r.cuisine}</span>
                {(r.nutritionLabels ?? []).slice(0, 2).map(d => (
                  <span key={d} className='tcard__diet'>
                    {prettyDiet(d)}
                  </span>
                ))}
              </div>
              <h3>{r.title}</h3>
              <div className='tcard__meta'>
                <span>
                  <CgTimer /> {formatTime(r.totalTime)}
                </span>
                <Stars value={r.rating.rateValue} count={r.rating.rateCount} />
              </div>
              <div className='tcard__price'>
                <strong>{servingPrice(r)}</strong> / serving
                <span>{recipePrice(r)} total</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C08 — Sticky filter header                                                 */
/* -------------------------------------------------------------------------- */
export const C08: FC = () => {
  const { filters, update, toggleDiet, results } = useRecipeFilters()
  const diets = ['VEGAN', 'VEGETARIAN', 'GLUTEN_FREE', 'High-Protein']
  return (
    <div className='rp-take c08'>
      <h1 className='c08-title'>Recipes</h1>
      <div className='c08-sticky'>
        <SearchBar value={filters.query} onChange={q => update({ query: q })} />
        <div className='c08-filters'>
          {diets.map(d => (
            <button
              key={d}
              className={`rp-chip ${filters.diets.includes(d) ? 'is-active' : ''}`}
              onClick={() => toggleDiet(d)}
            >
              {prettyDiet(d)}
            </button>
          ))}
          <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
        </div>
      </div>
      <ResultCount n={results.length} />
      <div className='c08-grid'>
        {results.map(r => (
          <PolishedCard key={r._id} r={r} />
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C09 — Price-forward (budget) cards                                         */
/* -------------------------------------------------------------------------- */
export const C09: FC = () => {
  const { filters, update, results } = useRecipeFilters({ sort: 'cheapest' })
  return (
    <div className='rp-take c09'>
      <header className='c09-head'>
        <h1>Budget-friendly recipes</h1>
        <p>Every recipe priced per serving so you can plan around your budget.</p>
      </header>
      <div className='c09-bar'>
        <SearchBar value={filters.query} onChange={q => update({ query: q })} />
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <ResultCount n={results.length} />
      <div className='c09-grid'>
        {results.map(r => (
          <a key={r._id} className='vcard' href='#' onClick={e => e.preventDefault()}>
            <div className='vcard__thumb'>
              <img src={r.recipeImage} alt={r.title} loading='lazy' />
            </div>
            <div className='vcard__body'>
              <div className='vcard__price'>
                <span className='vcard__per'>{servingPrice(r)}</span>
                <span className='vcard__label'>per serving</span>
              </div>
              <h3>{r.title}</h3>
              <div className='vcard__meta'>
                <span>
                  <CgTimer /> {formatTime(r.totalTime)}
                </span>
                <span>{recipePrice(r)} for {r.servings}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* C10 — Editorial header + refined grid                                      */
/* -------------------------------------------------------------------------- */
export const C10: FC = () => {
  const { filters, update, results } = useRecipeFilters()
  return (
    <div className='rp-take c10'>
      <header className='c10-hero'>
        <p className='c10-eyebrow'>The Prepify kitchen</p>
        <h1>Find your next favorite meal</h1>
        <p className='c10-sub'>
          {results.length} community recipes with nutrition and real cost per
          serving — filtered for the way you actually eat.
        </p>
        <SearchBar value={filters.query} onChange={q => update({ query: q })} />
      </header>
      <div className='c10-bar'>
        <ResultCount n={results.length} />
        <SortSelect value={filters.sort} onChange={s => update({ sort: s })} />
      </div>
      <div className='c10-grid'>
        {results.map(r => (
          <PolishedCard key={r._id} r={r} />
        ))}
      </div>
    </div>
  )
}
