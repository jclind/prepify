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
    body: 'Browse recipes with the price and nutrition already on the card. Filter by cuisine, diet, or meal type and build around your budget and your goals.',
  },
  {
    icon: <MdOutlineShoppingCart />,
    title: 'Shop',
    body: 'Every recipe breaks down to a real per-serving cost, so you can fill your cart with a clear total — no mental math in the aisle.',
  },
  {
    icon: <MdOutlineRestaurantMenu />,
    title: 'Cook',
    body: 'Follow clear, step-by-step recipes. Rate what you make, save your favorites, and come back to the meals that earn a spot in the rotation.',
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
    title: 'Real per-serving prices',
    body: 'Costs are calculated from the actual ingredients — shown up front, on every recipe.',
  },
  {
    icon: <MdOutlineMonitorHeart />,
    title: 'Full nutrition, automatically',
    body: 'Calories and macros are computed for you, so you can see how a meal fits your day.',
  },
  {
    icon: <MdOutlineTune />,
    title: 'Search & filter that works',
    body: 'Narrow by cuisine, diet, and meal type to find something that fits right now.',
  },
  {
    icon: <MdOutlineEditNote />,
    title: 'Add your own recipes',
    body: 'Paste your ingredients and let automatic parsing handle the price and nutrition math.',
  },
  {
    icon: <MdOutlineBookmarkBorder />,
    title: 'Save & revisit',
    body: 'Keep the meals you love a click away, and rate and review the ones worth sharing.',
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
        content='Prepify is a recipe site where every recipe shows its real per-serving price and full nutrition up front — so you can plan, shop, and cook with zero guesswork.'
      />
      <link rel='canonical' href='https://www.prepifymeals.com/about' />
      <meta property='og:title' content='About Prepify' />
      <meta
        property='og:description'
        content='Every recipe comes with its real per-serving price and full nutrition built in — so you always know what a meal costs and what is in it before you cook.'
      />
      <meta property='og:type' content='website' />
      <meta property='og:url' content='https://www.prepifymeals.com/about' />
    </Helmet>

    <div className='about-inner'>
      <header className='about-hero'>
        <p className='eyebrow'>About Prepify</p>
        <h1>Recipes that tell you the whole story.</h1>
        <p className='tagline'>
          Every recipe on Prepify comes with its real per-serving price and full
          nutrition built right in &mdash; so you always know what a meal costs,
          and what&rsquo;s in it, before you start cooking.
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
            Prepify is a recipe site with one promise: no surprises. The price
            and nutrition aren&rsquo;t an afterthought buried at the bottom of
            the page &mdash; they&rsquo;re calculated from the real ingredients
            and shown up front, on every recipe. Search, save, and cook knowing
            exactly what each meal costs and how it fits your day.
          </p>
        </div>
      </section>

      <section className='about-section how-it-works'>
        <div className='section-head'>
          <h2>How it works</h2>
          <p>Plan, shop, and cook with zero guesswork.</p>
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
          Most recipes tell you how to cook a dish &mdash; but never what it
          actually costs. We got tired of scrolling between tabs, guessing at
          grocery totals, and hoping a meal would fit the budget. So we built
          the recipe site we actually wanted to use: cost and nutrition
          transparency on every recipe, by default.
        </p>
        <p>
          Honestly, we built Prepify for ourselves &mdash; to surface the
          information we genuinely care about. I&rsquo;m Jesse, a self-taught
          developer who cooks at home. I lift, so I like to keep an eye on my
          nutrition &mdash; but more than that, I never want to get excited
          about a new recipe only to find it doesn&rsquo;t fit my budget.
          That&rsquo;s exactly why Prepify works the way it does.
        </p>
        <p>
          Prepify is an independent project, built and maintained with care by
          people who cook at home just like you. We&rsquo;re always improving
          it, and we read every piece of feedback that comes our way.
        </p>
      </section>

      <section className='about-section about-cta'>
        <h2>Ready to cook with zero guesswork?</h2>
        <p>Find your next meal &mdash; price and nutrition included.</p>
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
