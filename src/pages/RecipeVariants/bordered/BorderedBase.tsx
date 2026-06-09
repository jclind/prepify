import React, { FC, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { AiOutlineClockCircle, AiOutlineUsergroupAdd, AiOutlineEye, AiOutlineStar } from 'react-icons/ai'
import { BsStar } from 'react-icons/bs'
import { BiBookmark, BiPrinter, BiCheckCircle, BiEditAlt, BiTrash, BiLeftArrowAlt } from 'react-icons/bi'
import { FiMinus, FiPlus } from 'react-icons/fi'
import { TbToolsKitchen2 } from 'react-icons/tb'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import OwnerToggle from '../shared/OwnerToggle'
import RateWidget from '../shared/RateWidget'
import { scaledQty, macros, nutritionRows, compactNum } from '../shared/recipeHelpers'
import { mockRecipe, formatPrice } from '../mockRecipe'

type HeaderStyle = 'default' | 'strip' | 'overlay' | 'toolbar' | 'bar' | 'segment'

type Props = {
  /** root modifier class each variant styles in its own scss */
  rootClass: string
  /** lay ingredients + instructions side by side instead of stacked */
  splitBody?: boolean
  /** how the top section (image + title + meta + actions) is arranged */
  headerStyle?: HeaderStyle
  /** render a panel beside the instruction steps to use the right-hand space */
  stepAside?: 'ingredients' | 'notes'
}

/**
 * Shared layout for the "Classic Bordered" family. Polished rebuild of the real
 * SingleRecipe page in a crisp bordered style, with ingredient thumbnails and a
 * tinted "Your recipe" owner stats banner (the treatment carried over from the
 * Plus variant). The five variations are thin wrappers that pass a different
 * `rootClass` and ship their own scss. Adds an `is-owner` / `split` class on the
 * root so each scss can react.
 */
const BorderedBase: FC<Props> = ({ rootClass, splitBody = false, headerStyle = 'default', stepAside }) => {
  const r = mockRecipe
  const [isOwner, setIsOwner] = useState(false)
  const [servings, setServings] = useState(r.servings)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const scale = servings / r.servings
  const ms = macros(r.nutrition)
  const macroMax = Math.max(...ms.map(m => m.value))

  const toggle = (id: string) => {
    const n = new Set(checked)
    n.has(id) ? n.delete(id) : n.add(id)
    setChecked(n)
  }

  const meta = [
    { key: 'time', icon: <AiOutlineClockCircle />, t: 'Total Time', v: `${r.totalTime} min.` },
    { key: 'serv', icon: <AiOutlineUsergroupAdd />, t: 'Servings', v: `${servings}` },
    { key: 'rate', icon: <BsStar />, t: 'Rating', v: `${r.rating.rateValue} (${r.rating.rateCount})` },
  ]

  const eyebrowNode = <div className='eyebrow'>{r.cuisine} · {r.tags[0]}</div>
  const titleNode = <h1>{r.title}</h1>
  const descriptionNode = <p className='description'>{r.description}</p>
  const authorNode = (
    <div className='author-row'>
      <img src={r.authorAvatar} alt='' className='avatar' />
      <span>by <strong>@{r.author}</strong> · {new Date(r.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
    </div>
  )
  const actionsNode = (
    <div className='actions'>
      {isOwner ? (
        <>
          <button className='primary'><BiEditAlt /> Edit</button>
          <button className='secondary'><BiPrinter /> Print</button>
          <button className='danger'><BiTrash /> Delete</button>
        </>
      ) : (
        <>
          <button className='primary'><BiBookmark /> Save</button>
          <button className='secondary'><AiOutlineStar /> Rate</button>
          <button className='secondary'><BiPrinter /> Print</button>
        </>
      )}
    </div>
  )
  const dataCards = (
    <div className='data-row'>
      {meta.map(m => (
        <div className='data' key={m.key}><span className='icon'>{m.icon}</span><div><div className='t'>{m.t}</div><div className='v'>{m.v}</div></div></div>
      ))}
    </div>
  )
  const metaStrip = (
    <div className='meta-strip'>
      {meta.map(m => (
        <div className='ms-item' key={m.key}><span className='ms-ic'>{m.icon}</span><span className='ms-v'>{m.v}</span><span className='ms-t'>{m.t}</span></div>
      ))}
    </div>
  )
  const metaSegment = (
    <div className='meta-segment'>
      {meta.map(m => (
        <div className='seg' key={m.key}><span className='seg-ic'>{m.icon}</span><div className='seg-text'><div className='seg-v'>{m.v}</div><div className='seg-t'>{m.t}</div></div></div>
      ))}
    </div>
  )
  const imgMeta = (
    <div className='img-meta'>
      {meta.map(m => (
        <div className='im-item' key={m.key}><span className='im-ic'>{m.icon}</span><span className='im-v'>{m.v}</span></div>
      ))}
    </div>
  )
  const imageWrap = (overlay = false) => (
    <div className='image-wrap'>
      <img src={r.image} alt={r.title} />
      {overlay ? imgMeta : null}
    </div>
  )

  const renderHeader = () => {
    switch (headerStyle) {
      case 'strip':
        return (
          <header className='header'>
            {imageWrap()}
            <div className='desc'>{eyebrowNode}{titleNode}{descriptionNode}{authorNode}{metaStrip}{actionsNode}</div>
          </header>
        )
      case 'overlay':
        return (
          <header className='header'>
            {imageWrap(true)}
            <div className='desc'>{eyebrowNode}{titleNode}{descriptionNode}{authorNode}{actionsNode}</div>
          </header>
        )
      case 'toolbar':
        return (
          <header className='header'>
            {imageWrap()}
            <div className='desc'>
              <div className='desc-top'>{eyebrowNode}{actionsNode}</div>
              {titleNode}{descriptionNode}{authorNode}{metaStrip}
            </div>
          </header>
        )
      case 'bar':
        return (
          <>
            <header className='header'>
              {imageWrap()}
              <div className='desc'>{eyebrowNode}{titleNode}{descriptionNode}{authorNode}</div>
            </header>
            <div className='action-bar'>{metaStrip}{actionsNode}</div>
          </>
        )
      case 'segment':
        return (
          <header className='header'>
            {imageWrap()}
            <div className='desc'>{eyebrowNode}{titleNode}{descriptionNode}{authorNode}{metaSegment}{actionsNode}</div>
          </header>
        )
      default:
        return (
          <header className='header'>
            {imageWrap()}
            <div className='desc'>{eyebrowNode}{titleNode}{descriptionNode}{authorNode}{dataCards}{actionsNode}</div>
          </header>
        )
    }
  }

  const ingredients = (
    <section className='ingredients section'>
      <div className='sec-head'>
        <h2>Ingredients</h2>
        <div className='servings-control'>
          <button onClick={() => setServings(Math.max(1, servings - 1))}><FiMinus /></button>
          <span>{servings} serv</span>
          <button onClick={() => setServings(servings + 1)}><FiPlus /></button>
        </div>
      </div>
      <ul className='ing-list'>
        {r.ingredients.map(i => (
          <li key={i.id} className={checked.has(i.id) ? 'checked' : ''} onClick={() => toggle(i.id)}>
            <span className='box'>{checked.has(i.id) ? <BiCheckCircle /> : null}</span>
            <img src={i.image} alt='' className='ing-img' />
            <span className='qty'>{scale === 1 ? i.qty : scaledQty(i.qty, scale)}</span>
            <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
          </li>
        ))}
      </ul>
      <div className='price-line'>Estimated <strong>{formatPrice(r.servingPrice * servings)}</strong> total · {formatPrice(r.servingPrice)}/serving</div>
    </section>
  )

  const stepListNode = (
    <ol className='step-list'>
      {r.steps.map(s => (
        <li key={s.id}>
          <span className='num'>{s.index}</span>
          <div className='c'>
            <div className='step-meta'><span className={`phase ${s.phase}`}>{s.phase}</span><span className='dur'>{s.minutes} min</span></div>
            <p>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )

  const asideNode = stepAside === 'ingredients' ? (
    <aside className='step-aside'>
      <div className='aside-card'>
        <h3>You’ll need</h3>
        <ul className='need-list'>
          {r.ingredients.map(i => (
            <li key={i.id}><span className='nbox' /><span className='nq'>{i.qty}</span><span className='nn'>{i.name}</span></li>
          ))}
        </ul>
      </div>
    </aside>
  ) : stepAside === 'notes' ? (
    <aside className='step-aside'>
      <div className='aside-card'>
        <h3>Cook’s notes</h3>
        <ul className='tips'>
          <li>Salt the pasta water generously — it seasons the noodles from within.</li>
          <li>Reserve a cup of starchy water before draining to loosen the sauce.</li>
          <li>Add the parmesan off high heat so it melts silky, not grainy.</li>
        </ul>
        <div className='yield'>Serves {r.servings} · {r.totalTime} min total</div>
      </div>
    </aside>
  ) : null

  const instructions = (
    <section className='instructions section'>
      <h2>Instructions</h2>
      {stepAside ? (
        <div className='instructions-layout'>
          {stepListNode}
          {asideNode}
        </div>
      ) : (
        stepListNode
      )}
    </section>
  )

  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <div className={`bordered ${rootClass} ${isOwner ? 'is-owner' : ''} ${splitBody ? 'split' : ''}`}>
        <div className='controls'>
          <button className='back'><BiLeftArrowAlt /> All recipes</button>
          {isOwner && <span className='owner-badge'>Your recipe</span>}
        </div>

        {renderHeader()}

        {/* tinted "Your recipe" owner banner */}
        {isOwner && (
          <div className='owner-banner'>
            <div className='ob-label'><TbToolsKitchen2 /> Your recipe</div>
            <div className='ob-stats'>
              <div className='ob-stat'><AiOutlineEye className='ob-ic' /><span className='ob-n'>{compactNum(r.views)}</span><span className='ob-l'>views</span></div>
              <div className='ob-stat'><BiBookmark className='ob-ic' /><span className='ob-n'>{compactNum(r.saves)}</span><span className='ob-l'>saves</span></div>
              <div className='ob-stat'><TbToolsKitchen2 className='ob-ic' /><span className='ob-n'>{compactNum(r.madeIt)}</span><span className='ob-l'>made it</span></div>
              <div className='ob-stat'><AiOutlineStar className='ob-ic' /><span className='ob-n'>{r.rating.rateValue}</span><span className='ob-l'>avg rating</span></div>
            </div>
          </div>
        )}

        <div className='body'>
          {splitBody ? (
            <div className='split-grid'>
              {ingredients}
              {instructions}
            </div>
          ) : (
            <>
              {ingredients}
              {instructions}
            </>
          )}

          <section className='tags section'>
            <h2>Tags</h2>
            <div className='tag-list'>{r.tags.map(t => <span key={t} className='tag'>{t}</span>)}</div>
          </section>

          <div className='made-row'>
            <button className='made-btn'><TbToolsKitchen2 /> I made this</button>
          </div>

          <section className='nutrition section'>
            <h2>Nutrition</h2>
            <div className='nut-grid'>
              <div className='macros'>
                <div className='cal'><strong>{r.nutrition.calories}</strong> calories / serving</div>
                {ms.map(m => (
                  <div className='macro' key={m.key}>
                    <div className='macro-top'><span>{m.label}</span><span>{m.value}{m.unit}</span></div>
                    <div className='track'><div className='fill' style={{ width: `${(m.value / macroMax) * 100}%` }} /></div>
                  </div>
                ))}
                <div className='diet-labels'>{r.nutritionLabels.map(l => <span key={l} className='diet'>{l}</span>)}</div>
              </div>
              <table className='facts'>
                <tbody>
                  {nutritionRows(r.nutrition).map(row => (<tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className='reviews'>
          <div className='reviews-header'>
            <h2>Ratings &amp; Reviews</h2>
            <div className='avg'><div className='big'>{r.rating.rateValue}</div><div><div className='stars'>{'★'.repeat(Math.round(r.rating.rateValue))}{'☆'.repeat(5 - Math.round(r.rating.rateValue))}</div><div className='count'>{r.rating.rateCount} ratings</div></div></div>
          </div>
          {!isOwner && <div className='add-review'><RateWidget /></div>}
          <div className='review-list'>
            {r.reviews.map(rev => (
              <div className='review' key={rev.id}>
                <div className='review-head'><strong>@{rev.username}</strong><span className='stars'>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span><span className='date'>{rev.date}</span></div>
                <p>{rev.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
      <OwnerToggle isOwner={isOwner} onChange={setIsOwner} />
      <RecipeDesignSwitcher />
    </>
  )
}

export default BorderedBase
