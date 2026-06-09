import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { BiBookmark, BiPrinter } from 'react-icons/bi'
import { AiOutlineStar } from 'react-icons/ai'
import RecipeDesignSwitcher from '../RecipeDesignSwitcher'
import { mockRecipe, formatPrice } from '../mockRecipe'
import './RecipeEditorial.scss'

const RecipeEditorial: FC = () => {
  const r = mockRecipe
  return (
    <>
      <Helmet><title>Prepify | {r.title}</title></Helmet>
      <article className='recipe-editorial'>
        <div className='masthead'>
          <div className='kicker'>{r.cuisine} · Weeknight Dinner</div>
          <h1 className='headline'>{r.title}</h1>
          <p className='deck'>{r.description}</p>
          <div className='byline'>
            <img src={r.authorAvatar} alt='' />
            <div>
              <div className='by'>by <strong>{r.author}</strong></div>
              <div className='pub-info'>Published {new Date(r.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })} · {r.totalTime} min · Serves {r.servings}</div>
            </div>
          </div>
        </div>

        <figure className='hero-figure'>
          <img src={r.image} alt={r.title} />
          <figcaption>{r.title} — photograph by @{r.author}</figcaption>
        </figure>

        <div className='lead'>
          <p>
            <span className='drop-cap'>T</span>here are weeknight pastas, and then there are
            weeknights when the pasta carries you. This one is the second kind — the kind that
            uses what's already in your pantry and quietly transforms it. Twenty minutes of
            stirring, no fancy technique, and what comes out is somehow exactly what you
            wanted all along.
          </p>
        </div>

        <aside className='specs'>
          <div className='spec'><div className='spec-label'>Prep</div><div className='spec-val'>{r.prepTime} min</div></div>
          <div className='spec'><div className='spec-label'>Cook</div><div className='spec-val'>{r.cookTime} min</div></div>
          <div className='spec'><div className='spec-label'>Total</div><div className='spec-val'>{r.totalTime} min</div></div>
          <div className='spec'><div className='spec-label'>Yield</div><div className='spec-val'>{r.servings} servings</div></div>
          <div className='spec'><div className='spec-label'>Cost</div><div className='spec-val'>{formatPrice(r.servingPrice)}/serv</div></div>
          <div className='spec'><div className='spec-label'>Rating</div><div className='spec-val'>{r.rating.rateValue} ★</div></div>
        </aside>

        <div className='actions-bar'>
          <button className='primary'><BiBookmark /> Save recipe</button>
          <button><AiOutlineStar /> Rate</button>
          <button><BiPrinter /> Print</button>
        </div>

        <section className='ingredients'>
          <div className='section-rule'>
            <span>Ingredients</span>
          </div>
          <div className='ing-cols'>
            <ul>
              {r.ingredients.slice(0, 5).map(i => (
                <li key={i.id}>
                  <span className='qty'>{i.qty}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
            <ul>
              {r.ingredients.slice(5).map(i => (
                <li key={i.id}>
                  <span className='qty'>{i.qty}</span>
                  <span className='name'>{i.name}{i.note ? `, ${i.note}` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className='preparation'>
          <div className='section-rule'>
            <span>Preparation</span>
          </div>
          {r.steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className='step'>
                <div className='step-number'>{s.index}</div>
                <p>{s.text}</p>
              </div>
              {i === 3 && (
                <blockquote className='pull-quote'>
                  "The sauce should turn glossy and coat the back of a spoon —
                  that's when you know it's ready for the parmesan."
                </blockquote>
              )}
            </React.Fragment>
          ))}
        </section>

        <footer className='article-footer'>
          <div className='note'>
            <strong>A note on the cheese</strong>
            <p>Pre-grated parmesan is coated to prevent clumping and won't melt into a
            silky sauce. Grate a block yourself, even if it costs a few extra minutes — you
            will taste the difference, and the sauce will behave.</p>
          </div>
          <div className='tags-row'>
            <span className='tag-label'>Filed under:</span>
            {r.tags.map(t => <span key={t} className='tag'>{t}</span>)}
          </div>
        </footer>
      </article>
      <RecipeDesignSwitcher />
    </>
  )
}

export default RecipeEditorial
