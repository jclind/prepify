import React, { FC, ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  FiDollarSign,
  FiPieChart,
  FiSearch,
  FiEdit3,
  FiStar,
  FiHeart,
  FiClock,
  FiArrowRight,
  FiShoppingCart,
  FiBookOpen,
} from 'react-icons/fi'
import './About.scss'

type Feature = {
  icon: ReactElement
  title: string
  body: string
}

// "What you can do" is the capability set behind the journey. Six, so the grid
// stays balanced (3×2 desktop, 2×3 tablet, 1-up mobile).
const FEATURES: Feature[] = [
  {
    icon: <FiDollarSign aria-hidden='true' />,
    title: 'Real per-serving prices',
    body: 'Worked out from the actual ingredients, not rough estimates, and shown on every recipe.',
  },
  {
    icon: <FiPieChart aria-hidden='true' />,
    title: 'Nutrition, automatically',
    body: 'Calories and macros are computed for you. No spreadsheets, no guesswork.',
  },
  {
    icon: <FiSearch aria-hidden='true' />,
    title: 'Smart search & filters',
    body: 'Narrow by cuisine, diet, and meal type to find something that fits in seconds.',
  },
  {
    icon: <FiEdit3 aria-hidden='true' />,
    title: 'Build your own recipes',
    body: 'Paste your ingredients and we handle the price and nutrition math for you.',
  },
  {
    icon: <FiStar aria-hidden='true' />,
    title: 'Ratings & reviews',
    body: 'See what the community thinks, and share your own take on what you cook.',
  },
  {
    icon: <FiHeart aria-hidden='true' />,
    title: 'Save your favorites',
    body: 'Keep the meals you love a click away, ready for the next time you cook.',
  },
]

type Step = {
  label: string
  body: string
}

// "How it works" is the journey, in order. Outcome-focused so it doesn't just
// re-list the capabilities in the feature grid below.
const STEPS: Step[] = [
  {
    label: 'Plan',
    body: 'Browse recipes with the price and nutrition right on the card, and build around your budget and your goals.',
  },
  {
    label: 'Shop',
    body: 'Head to the store with a clear per-serving total. No surprises at checkout, no math in the aisle.',
  },
  {
    label: 'Cook',
    body: 'Follow the step-by-step recipe, then save the winners so they are easy to find again.',
  },
]

const MACROS = [
  { label: 'Protein', value: '42g' },
  { label: 'Fat', value: '18g' },
  { label: 'Carbs', value: '30g' },
  { label: 'Fiber', value: '6g' },
]

// Two real Prepify surfaces, shown rather than described, and kept honest:
//  • the browse card (faithful to the actual recipe thumbnail: image, title,
//    per-serving PRICE, time, rating — thumbnails never show nutrition), and
//  • the recipe page's Nutrition panel (where per-serving nutrition actually
//    lives) alongside it.
// Decorative sample data, so the whole composition is hidden from assistive tech.
const ProductShowcase: FC = () => (
  <div className='about-mock' aria-hidden='true'>
    <div className='about-card'>
      <div className='about-card-media'>
        <span className='about-card-price'>$3.18/serv</span>
      </div>
      <div className='about-card-body'>
        <h3 className='about-card-title'>Tuscan Chicken Skillet</h3>
        <div className='about-card-meta'>
          <span>
            <FiClock aria-hidden='true' /> 45m
          </span>
          <span>
            <FiStar aria-hidden='true' /> 4.8
          </span>
          <span>Italian</span>
        </div>
      </div>
    </div>

    <div className='about-nutrition'>
      <p className='about-nutrition-label'>Nutrition per serving</p>
      <p className='about-nutrition-cal'>
        520 <span>cal</span>
      </p>
      <div className='about-nutrition-macros'>
        {MACROS.map(m => (
          <div className='about-macro' key={m.label}>
            <span className='about-macro-value'>{m.value}</span>
            <span className='about-macro-label'>{m.label}</span>
          </div>
        ))}
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

    <header className='about-hero'>
      <p className='about-eyebrow'>About Prepify</p>
      <h1 className='about-hero-title'>Prepify&rsquo;s got your back.</h1>
      <p className='about-hero-tagline'>
        No more surprises. Every recipe on the site shows its real price per
        serving and full nutrition, upfront. You always know what you&rsquo;re
        getting into before you start cooking.
      </p>
      <div className='about-cta'>
        <Link to='/recipes' className='about-btn about-btn-primary'>
          Browse recipes
        </Link>
        <Link to='/signup' className='about-btn about-btn-ghost'>
          Create an account
        </Link>
      </div>
    </header>

    <section className='about-section about-showcase'>
      <div className='about-showcase-inner'>
        <ProductShowcase />
        <p className='about-showcase-caption'>
          The price lives on the card. The full nutrition lives on the recipe.
          Always there, always upfront.
        </p>
      </div>
    </section>

    <section className='about-section about-moment'>
      <p className='about-moment-kicker'>Transparency, by default.</p>
      <p className='about-moment-line'>
        Prepify is all about transparency. We&rsquo;re a recipe site that keeps
        it real. No buried costs, no missing nutrition info. It&rsquo;s all
        calculated from the actual ingredients and shown right there on the
        recipe.
      </p>
    </section>

    <section className='about-section about-section-tint about-steps'>
      <div className='about-section-head'>
        <p className='about-section-eyebrow'>How it works</p>
        <h2 className='about-section-title'>Three simple steps.</h2>
      </div>
      <ol className='about-steps-grid'>
        {STEPS.map((step, i) => (
          <li className='about-step' key={step.label}>
            <span className='about-step-num'>{i + 1}</span>
            <h3 className='about-step-label'>{step.label}</h3>
            <p className='about-step-body'>{step.body}</p>
          </li>
        ))}
      </ol>
    </section>

    <section className='about-section about-features'>
      <div className='about-section-head'>
        <p className='about-section-eyebrow'>Everything you need</p>
        <h2 className='about-section-title'>Built for the way you cook.</h2>
      </div>
      <ul className='about-features-grid'>
        {FEATURES.map(f => (
          <li className='about-feature' key={f.title}>
            <span className='about-feature-icon' aria-hidden='true'>
              {f.icon}
            </span>
            <div className='about-feature-text'>
              <h3 className='about-feature-title'>{f.title}</h3>
              <p className='about-feature-body'>{f.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>

    <section className='about-section about-story'>
      <div className='about-section-head'>
        <p className='about-section-eyebrow'>Why we built it</p>
        <h2 className='about-section-title'>We were tired of guessing.</h2>
      </div>
      <div className='about-story-body'>
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
      </div>
    </section>

    <section className='about-section about-section-tint about-closing'>
      <h2 className='about-closing-title'>Ready to cook with zero guesswork?</h2>
      <p className='about-closing-line'>
        Find your next meal. Price and nutrition included.
      </p>
      <div className='about-cta'>
        <Link to='/recipes' className='about-btn about-btn-primary'>
          Browse recipes
          <FiArrowRight aria-hidden='true' />
        </Link>
        <Link to='/signup' className='about-btn about-btn-ghost'>
          Create an account
        </Link>
      </div>
      <div className='about-closing-icons' aria-hidden='true'>
        <FiShoppingCart />
        <FiBookOpen />
        <FiHeart />
      </div>
    </section>
  </div>
)

export default About
