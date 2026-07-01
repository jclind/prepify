// TEMP audit page — button hover-effect normalization. Remove before PR merge.
// Route: /button-hover-audit  (see App.tsx). Reproduces the current, drifted
// button-hover behaviour, then offers three candidate hover "languages" to pick.
import { FC, ReactNode } from 'react'
import {
  PlusIcon,
  ArrowRightIcon,
  SearchIcon,
  HeartIcon,
  BookmarkIcon,
} from 'src/Components/icons'
import './ButtonHoverAudit.scss'

interface Specimen {
  cls: string
  name: string
  src: string
  effect: ReactNode
  icon?: 'plus' | 'arrow' | 'search' | 'heart'
  round?: boolean
}

const iconFor = (k?: string) => {
  if (k === 'plus') return <PlusIcon />
  if (k === 'arrow') return <ArrowRightIcon />
  if (k === 'search') return <SearchIcon />
  if (k === 'heart') return <HeartIcon />
  return null
}

// The current state, grouped by the *kind* of hover motion in play.
const CURRENT: { group: string; blurb: string; items: Specimen[] }[] = [
  {
    group: 'The system baseline — colour-only (good)',
    blurb:
      'The shared .btn variants (index.scss) animate only colour on hover. Calm and consistent — the reference point.',
    items: [
      { cls: 'btn btn--primary', name: 'btn--primary', src: 'index.scss:157', effect: <>bg → $primary-hover</>, icon: 'plus' },
      { cls: 'btn btn--outline', name: 'btn--outline', src: 'index.scss:167', effect: <>border → text colour</> },
      { cls: 'btn btn--ghost', name: 'btn--ghost', src: 'index.scss:176', effect: <>text → $primary-text</> },
      { cls: 'btn btn--danger', name: 'btn--danger', src: 'index.scss:185', effect: <>inverts to red fill</> },
    ],
  },
  {
    group: 'Lift buttons — translateY, four different distances',
    blurb:
      'Roughly the same idea (button rises on hover) implemented at −1, −2, −3, −4px with different timings, shadows, and even sideways icon nudges. No shared rule.',
    items: [
      { cls: 'cur-home-cta', name: 'Home CTA', src: 'Home.scss:226', effect: <><code>translateY(-2px)</code> + bg swap</>, icon: 'arrow' },
      { cls: 'cur-about', name: 'About secondary', src: 'About.scss:66,76', effect: <><code>-2px</code>; icon slides <code>+3px</code> →</>, icon: 'arrow' },
      { cls: 'cur-saved', name: 'Saved filter', src: 'SavedRecipes.scss:37', effect: <><code>-1px</code> + elevation-3</> },
      { cls: 'cur-recipes-sort', name: 'Recipes sort', src: 'Recipes.scss:258', effect: <><code>-2px</code> + brand shadow; icon <em>down</em> 2px</>, icon: 'arrow' },
    ],
  },
  {
    group: 'Brightness fills — six magnitudes, one backwards',
    blurb:
      'Filled buttons brighten via filter, but every surface picked its own value (1.05 / 1.06 / 1.07 / 108% / 110%) — and the auth submit DARKENS on hover.',
    items: [
      { cls: 'cur-empty', name: 'Empty-state CTA', src: 'EmptyState.scss:64', effect: <><code>brightness(1.05)</code> + −1px</>, icon: 'plus' },
      { cls: 'cur-herosearch', name: 'Hero search', src: 'HomeHero.scss:72', effect: <><code>brightness(1.06)</code> + −1px</>, icon: 'search' },
      { cls: 'cur-chip', name: 'Filter chip', src: 'Recipes.scss:330', effect: <><code>brightness(1.07)</code></> },
      { cls: 'cur-summary', name: 'Publish submit', src: 'SummaryBar.scss:115', effect: <><code>brightness(110%)</code></> },
      { cls: 'cur-form', name: 'Auth submit', src: 'FormStyles.scss:229', effect: <span className='bha__flag'><code>brightness(0.95)</code> — darkens!</span> },
    ],
  },
  {
    group: 'Scale & cards — the outliers',
    blurb:
      'A few surfaces grow instead of rising; the recipe cards themselves lift −3 and −4px inconsistently.',
    items: [
      { cls: 'cur-scale', name: 'Avatar tile', src: 'PublicProfile.scss:241', effect: <><code>scale(1.04)</code></>, round: true, icon: 'heart' },
      { cls: 'cur-card', name: 'RecipeCard', src: 'RecipeCard.scss:14', effect: <><code>translateY(-4px)</code> + elevation-4</> },
      { cls: 'cur-card-trending', name: 'Trending card', src: 'Home.scss:80', effect: <><code>translateY(-3px)</code> + elevation-4</> },
    ],
  },
]

interface Candidate {
  key: string
  ns: string
  title: string
  tag: string
  spec: ReactNode[]
  recommended?: boolean
}

const CANDIDATES: Candidate[] = [
  {
    key: 'A',
    ns: 'candA',
    title: 'A · Calm',
    tag: 'Buttons never move. Hover is a pure colour response (the current .btn baseline, extended to everything). Motion is reserved for cards.',
    spec: [
      <>Fill: <code>bg → darker</code></>,
      <>Outline: <code>border/text darken</code></>,
      <>Ghost: <code>text → primary</code></>,
      <>Card: <code>shadow deepens</code> (no lift)</>,
      <>One timing: <code>0.15s ease</code></>,
    ],
  },
  {
    key: 'B',
    ns: 'candB',
    title: 'B · Lift',
    tag: 'Everything rises a single uniform amount and gains a shadow — codifies the most common current pattern. Tactile / premium.',
    spec: [
      <>Buttons: <code>translateY(-2px)</code> + shadow</>,
      <>Cards: <code>translateY(-4px)</code> + elevation-4</>,
      <>Ghost stays flat (no surface)</>,
      <>Plus the colour shift from A</>,
      <>One lift scale, one shadow story</>,
    ],
    recommended: true,
  },
  {
    key: 'C',
    ns: 'candC',
    title: 'C · Press',
    tag: 'One unified brightness step on hover (replacing the six values), and a real click-press on :active. Energetic, physical, no vertical drift.',
    spec: [
      <>Hover: <code>brightness(1.06)</code> (one value)</>,
      <>Active: <code>translateY(1px)</code> press</>,
      <>Outline/ghost: tint + press</>,
      <>Card: subtle brighten + shadow</>,
      <>Motion happens on click, not hover</>,
    ],
  },
]

const ButtonHoverAudit: FC = () => {
  return (
    <div className='bha'>
      <header className='bha__head'>
        <h1 className='bha__title'>Button hover audit</h1>
        <p className='bha__lede'>
          The colour system was unified (PR&nbsp;#210), but the hover <em>motion</em> never was.
          Below is every distinct hover behaviour shipping today — hover each one to feel the drift —
          then three candidate languages to standardize on. <strong>Pick a column.</strong>
        </p>
        <p className='bha__note'>
          Temp page · <code>/button-hover-audit</code> · reproductions mirror the cited source declarations 1:1.
        </p>
      </header>

      {/* ---- Current state ---- */}
      <section className='bha__section'>
        <h2 className='bha__h2'>1 · Current state — what ships today</h2>
        <p className='bha__hint'>↓ hover the buttons ↓</p>
        {CURRENT.map(g => (
          <div key={g.group} style={{ marginBottom: '2rem' }}>
            <h3 className='bha__candhead' style={{ fontSize: '1.05rem' }}>{g.group}</h3>
            <p className='bha__sub'>{g.blurb}</p>
            <div className='bha__grid'>
              {g.items.map(s => (
                <div className='bha__cell' key={s.name}>
                  <div className='bha__demo'>
                    <button className={s.cls}>
                      {iconFor(s.icon)}
                      {!s.round && <span>{s.name.length > 14 ? 'Button' : s.name}</span>}
                    </button>
                  </div>
                  <div className='bha__meta'>
                    <span className='bha__name'>{s.name}</span>
                    <span className='bha__src'>{s.src}</span>
                    <span className='bha__effect'>{s.effect}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ---- Candidates ---- */}
      <section className='bha__section'>
        <h2 className='bha__h2'>2 · Candidate hover languages — pick one</h2>
        <p className='bha__sub'>
          Same four button types under each language. All three share <strong>one 150ms ease timing token</strong> and
          respect <code>prefers-reduced-motion</code> (motion collapses, colour stays). Hover the specimens to compare.
        </p>
        <p className='bha__hint'>↓ hover to compare ↓</p>
        <div className='bha__cands'>
          {CANDIDATES.map(c => (
            <div className={`bha__cand${c.recommended ? ' bha__cand--rec' : ''}`} key={c.key}>
              <h3 className='bha__candhead'>
                {c.title}
                {c.recommended && <span className='bha__pick'>my pick</span>}
              </h3>
              <p className='bha__candtag'>{c.tag}</p>
              <div className='bha__row'>
                <button className={`${c.ns}__primary`}><PlusIcon />Primary</button>
                <button className={`${c.ns}__outline`}>Outline</button>
                <button className={`${c.ns}__ghost`}><BookmarkIcon />Ghost</button>
              </div>
              <div className='bha__row'>
                <div className={`bha__card ${c.ns}__card`}>Card</div>
              </div>
              <ul className='bha__spec'>
                {c.spec.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ButtonHoverAudit
