import React, { FC, ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CgTimer } from 'react-icons/cg'
import { AiOutlineStar } from 'react-icons/ai'
import {
  MdOutlineSearch,
  MdOutlineShoppingCart,
  MdOutlineRestaurantMenu,
  MdOutlineSell,
  MdOutlineMonitorHeart,
  MdOutlineTune,
  MdOutlineEditNote,
  MdOutlineBookmarkBorder,
  MdOutlineStarBorder,
  MdOutlineDinnerDining,
} from 'react-icons/md'
import './About.scss'

type Step = {
  icon: ReactElement
  title: string
  body: string
}

// "How it works" is the journey — what you actually do, in order. It stays
// outcome-focused so it doesn't just re-list the capabilities in the feature
// grid below (which owns the specifics).
const STEPS: Step[] = [
  {
    icon: <MdOutlineSearch />,
    title: 'Plan',
    body: 'Browse recipes with the price and nutrition right on the card, and build around your budget and your goals.',
  },
  {
    icon: <MdOutlineShoppingCart />,
    title: 'Shop',
    body: 'Head to the store with a clear per-serving total. No surprises at checkout, no math in the aisle.',
  },
  {
    icon: <MdOutlineRestaurantMenu />,
    title: 'Cook',
    body: 'Follow the step-by-step recipe, then save the winners so they are easy to find again.',
  },
]

type Feature = {
  icon: ReactElement
  title: string
  body: string
}

// "What you can do" is the capability set — the specifics behind the journey.
// Six, so the grid stays balanced (3×2 desktop, 2×3 tablet, 1-up mobile).
const FEATURES: Feature[] = [
  {
    icon: <MdOutlineSell />,
    title: 'Real per-serving prices',
    body: 'Worked out from the actual ingredients, not rough estimates, and shown on every recipe.',
  },
  {
    icon: <MdOutlineMonitorHeart />,
    title: 'Nutrition, automatically',
    body: 'Calories and macros are computed for you. No spreadsheets, no guesswork.',
  },
  {
    icon: <MdOutlineTune />,
    title: 'Smart search & filters',
    body: 'Narrow by cuisine, diet, and meal type to find something that fits in seconds.',
  },
  {
    icon: <MdOutlineEditNote />,
    title: 'Build your own recipes',
    body: 'Paste your ingredients and we handle the price and nutrition math for you.',
  },
  {
    icon: <MdOutlineStarBorder />,
    title: 'Ratings & reviews',
    body: 'See what the community thinks, and share your own take on what you cook.',
  },
  {
    icon: <MdOutlineBookmarkBorder />,
    title: 'Save your favorites',
    body: 'Keep the meals you love a click away, ready for the next time you cook.',
  },
]

// Macro bars for the nutrition panel — mirrors the real recipe-page nutrition
// component (label + per-serving value + a bar scaled to the largest macro, so
// protein at 42g is the full-width reference here).
const PROOF_MACROS = [
  { label: 'Protein', value: '42g', pct: 100 },
  { label: 'Fat', value: '18g', pct: 43 },
  { label: 'Carbs', value: '30g', pct: 71 },
  { label: 'Fiber', value: '6g', pct: 14 },
]

// Two real Prepify surfaces, shown rather than described — kept honest:
//  • the browse card (faithful to the actual recipe thumbnail: image, title,
//    per-serving PRICE, time, rating — thumbnails never show nutrition), and
//  • the recipe page's Nutrition panel (where per-serving nutrition actually
//    lives) floated alongside it.
// Decorative sample data, so the whole composition is hidden from assistive tech.
const ProofCard: FC = () => (
  <div className='hero-proof' aria-hidden='true'>
    <div className='proof-stack'>
      <div className='proof-card'>
        <div className='proof-thumb'>
          <MdOutlineDinnerDining className='proof-dish' />
          <span className='proof-price'>$3.18/serv</span>
        </div>
        <div className='proof-body'>
          <h3>Tuscan Chicken Skillet</h3>
          <div className='proof-meta'>
            <span>
              <CgTimer /> 45m
            </span>
            <span>
              <AiOutlineStar /> 4.8
            </span>
            <span className='proof-cuisine'>Italian</span>
          </div>
        </div>
      </div>

      <div className='proof-nutrition'>
        <div className='pn-head'>
          <h4>Nutrition</h4>
          <span className='pn-per'>per serving</span>
        </div>
        <div className='pn-cal'>
          <strong>520</strong> calories
        </div>
        <div className='pn-macros'>
          {PROOF_MACROS.map(m => (
            <div className='pn-macro' key={m.label}>
              <div className='pn-macro-top'>
                <span>{m.label}</span>
                <span>{m.value}</span>
              </div>
              <div className='pn-track'>
                <div className='pn-fill' style={{ width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// About / marketing page. Storytelling, not legal — what Prepify is, how it
// works, why it exists, and a closing call to action. This page owns its own
// <title> + og:* meta on purpose: the global meta/SEO pass (Track 3b) skips
// About to avoid a collision here. NOTE: index.html ships static og:* defaults
// that react-helmet-async can't dedupe, so these page-level og tags coexist with
// the generic ones until 3b reconciles index.html site-wide.
const About: FC = () => (
  <div className='about-page'>
    <Helmet>
      <meta charSet='utf-8' />
      <title>Prepify | About</title>
      <meta
        name='description'
        content='Prepify is a recipe site where every recipe shows its real per-serving price and full nutrition up front, so you can plan, shop, and cook with zero guesswork.'
      />
      <link rel='canonical' href='https://www.prepifymeals.com/about' />
      <meta property='og:title' content='About Prepify' />
      <meta
        property='og:description'
        content='No more surprises. Every recipe on Prepify shows its real price per serving and full nutrition up front. You always know what you are getting into before you start cooking.'
      />
      <meta property='og:type' content='website' />
      <meta property='og:url' content='https://www.prepifymeals.com/about' />
    </Helmet>

    <div className='about-inner'>
      <header className='about-hero'>
        <div className='hero-copy'>
          <p className='eyebrow'>About Prepify</p>
          <h1>Prepify&rsquo;s got your back.</h1>
          <p className='tagline'>
            No more surprises. Every recipe on the site shows its real price per
            serving and full nutrition, upfront. You always know what
            you&rsquo;re getting into before you start cooking.
          </p>
          <div className='hero-cta'>
            <Link to='/recipes' className='btn-primary'>
              Browse recipes
            </Link>
            <Link to='/signup' className='btn-secondary'>
              Create an account
            </Link>
          </div>
        </div>
        <ProofCard />
      </header>

      <section className='about-section about-story'>
        <div className='section-head'>
          <h2>What Prepify is</h2>
        </div>
        <p>
          Prepify is all about transparency. We&rsquo;re a recipe site that
          keeps it real. No buried costs, no missing nutrition info.
          It&rsquo;s all calculated from the actual ingredients and shown right
          there on the recipe.
        </p>
      </section>

      <section className='about-section how-it-works'>
        <div className='section-head'>
          <h2>How it works</h2>
          <p>Three simple steps: plan, shop, and cook.</p>
        </div>
        <ol className='steps-grid'>
          {STEPS.map((step, i) => (
            <li key={step.title} className='step-card'>
              <span className='step-num'>{i + 1}</span>
              <span className='step-icon' aria-hidden='true'>
                {step.icon}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className='about-section features'>
        <div className='section-head'>
          <h2>What you can do</h2>
          <p>Everything Prepify gives you, in one place.</p>
        </div>
        <ul className='features-grid'>
          {FEATURES.map(feature => (
            <li key={feature.title} className='feature-card'>
              <span className='feature-icon' aria-hidden='true'>
                {feature.icon}
              </span>
              <div className='feature-text'>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className='about-section about-story'>
        <div className='section-head'>
          <h2>Why we built it</h2>
        </div>
        <p>
          We built Prepify because we were tired of guessing. Most recipes
          don&rsquo;t tell you what they actually cost, so we got tired of
          scrolling between tabs and hoping a meal would fit the budget. So we
          built the recipe site we wanted to use: cost and nutrition
          transparency, on every recipe, by default.
        </p>
        <p>
          I&rsquo;m Jesse, a self-taught developer who cooks at home. I built
          Prepify for myself, to surface the info I actually care about. I like
          to keep an eye on my nutrition, but I also don&rsquo;t want to get
          excited about a recipe only to find it doesn&rsquo;t fit my budget.
          That&rsquo;s why Prepify works the way it does.
        </p>
        <p>
          We&rsquo;re independent, built and maintained with care by people who
          cook at home. We&rsquo;re always improving, and we read every piece of
          feedback that comes our way.
        </p>
      </section>

      <section className='about-section about-cta'>
        <h2>Ready to cook with zero guesswork?</h2>
        <p>Find your next meal. Price and nutrition included.</p>
        <div className='cta-actions'>
          <Link to='/recipes' className='btn-primary'>
            Browse recipes
          </Link>
          <Link to='/signup' className='btn-secondary'>
            Create an account
          </Link>
        </div>
      </section>
    </div>
  </div>
)

export default About
