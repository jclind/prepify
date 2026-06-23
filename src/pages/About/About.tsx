import React, { FC, ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  MdOutlineSearch,
  MdOutlineShoppingCart,
  MdOutlineRestaurantMenu,
  MdOutlineSell,
  MdOutlineMonitorHeart,
  MdOutlineTune,
  MdOutlineEditNote,
  MdOutlineBookmarkBorder,
} from 'react-icons/md'
import './About.scss'

type Step = {
  icon: ReactElement
  title: string
  body: string
}

// Plan → shop → cook: the three-beat promise the whole product is built around.
const STEPS: Step[] = [
  {
    icon: <MdOutlineSearch />,
    title: 'Plan',
    body: 'Browse recipes with prices and nutrition already on the card. Filter by cuisine, diet, or meal type, and build your plan around your budget and goals.',
  },
  {
    icon: <MdOutlineShoppingCart />,
    title: 'Shop',
    body: 'Every recipe breaks down to a real cost per serving. No more mental math in the aisle. Fill your cart with a clear total.',
  },
  {
    icon: <MdOutlineRestaurantMenu />,
    title: 'Cook',
    body: 'Follow clear, step-by-step recipes. Rate what you make, save your favorites, and come back to the ones you love.',
  },
]

type Feature = {
  icon: ReactElement
  title: string
  body: string
}

const FEATURES: Feature[] = [
  {
    icon: <MdOutlineSell />,
    title: 'Real price per serving',
    body: 'We show you the real price per serving, calculated from the actual ingredients.',
  },
  {
    icon: <MdOutlineMonitorHeart />,
    title: 'Full nutrition, automatically',
    body: 'Calories and macros are computed for you. No spreadsheets required.',
  },
  {
    icon: <MdOutlineTune />,
    title: 'Search & filter that works',
    body: 'Search and filter by cuisine, diet, and meal type to find something that fits.',
  },
  {
    icon: <MdOutlineEditNote />,
    title: 'Add your own recipes',
    body: 'Add your own recipes and let us handle the price and nutrition math.',
  },
  {
    icon: <MdOutlineBookmarkBorder />,
    title: 'Save & revisit',
    body: 'Save and revisit your favorite meals. The ones you love, a click away.',
  },
]

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
      </header>

      <section className='about-section'>
        <div className='section-head'>
          <h2>What Prepify is</h2>
          <p>
            Prepify is all about transparency. We&rsquo;re a recipe site that
            keeps it real. No buried costs, no missing nutrition info.
            It&rsquo;s all calculated from the actual ingredients and shown right
            there on the recipe.
          </p>
        </div>
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
          <p>Here&rsquo;s the good stuff.</p>
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
