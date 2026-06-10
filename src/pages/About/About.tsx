import React, { FC } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import './About.scss'

// About / marketing page. Storytelling, not legal — what Prepify is, why it
// exists, its key features, and calls to action.
const About: FC = () => (
  <div className='about-page'>
    <Helmet>
      <title>Prepify | About</title>
      <meta
        name='description'
        content='Prepify is a recipe site where every recipe ships with real per-serving price and nutrition data, so you can plan, shop, and cook with zero guesswork.'
      />
    </Helmet>
    <div className='about-inner'>
      <header className='about-hero'>
        <h1>About Prepify</h1>
        <p className='tagline'>
          Real recipes with the prices and nutrition baked in. Plan, shop, and
          cook with zero guesswork.
        </p>
      </header>

      <section>
        <h2>What Prepify is</h2>
        <p>
          Prepify is a recipe site where every recipe ships with real
          per-serving <strong>price</strong> and <strong>nutrition</strong> data.
          Instead of guessing what a meal will cost or how it fits your goals,
          you see the numbers up front — so you can plan, shop, and cook with
          confidence.
        </p>
      </section>

      <section>
        <h2>Why it exists</h2>
        <p>
          Most recipes tell you how to cook, but not what it costs or what&rsquo;s
          in it. That leaves you scrolling between tabs, doing mental math at the
          grocery store, and hoping a meal fits your budget and your diet. Prepify
          was built to close that gap: cost and nutrition transparency, on every
          recipe, by default.
        </p>
      </section>

      <section>
        <h2>What you can do</h2>
        <ul>
          <li>
            <strong>Create recipes</strong> with automatic ingredient parsing and
            nutrition data.
          </li>
          <li>
            <strong>Search and filter</strong> by cuisine, diet, meal type, and
            more.
          </li>
          <li>
            See <strong>per-serving price and nutrition</strong> on every recipe.
          </li>
          <li>
            <strong>Rate and review</strong> recipes and read what others think.
          </li>
          <li>
            <strong>Save recipes</strong> to come back to the meals you love.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who&rsquo;s behind it</h2>
        <p>
          Prepify is an independent project built by a small team of home cooks
          and developers who wanted a smarter way to plan meals. We&rsquo;re
          always improving it — and we&rsquo;d love your feedback.
        </p>
      </section>

      <section className='about-cta'>
        <Link to='/recipes' className='cta-primary'>
          Browse recipes
        </Link>
        <Link to='/signup' className='cta-secondary'>
          Create an account
        </Link>
      </section>
    </div>
  </div>
)

export default About
