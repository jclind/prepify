// TEMPORARY design-exploration page for the §D Ratings & Reviews overhaul
// (PR-C). Renders the three candidate directions from
// design-explorations/reviews/ratings-reviews.html with the real design
// system (StarRating, DefaultAvatar, .btn classes, helpers tokens) so the
// owner can compare them in app context at /design/reviews.
// Not linked from anywhere; delete this folder + its route before PR-C merges.
import React, { FC, useEffect, useState } from 'react'
import Skeleton from 'react-loading-skeleton'
import StarRating from 'src/Components/StarRating/StarRating'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'
import { skeletonBase } from 'src/util/loadingStyles'
import {
  ChevronDownIcon,
  EditIcon,
  MoreIcon,
  TrashIcon,
} from 'src/Components/icons'
import './DesignReviews.scss'

const AVG = 4.2
const RATE_COUNT = 8
// per-star counts, 5★ → 1★ (sums to RATE_COUNT); widths scale to the max bucket
const BREAKDOWN = [4, 2, 1, 0, 1]
const MAX_BUCKET = Math.max(...BREAKDOWN)

type FixtureReview = {
  name: string | null
  handle: string
  date: string
  rating: number | null
  text: string
  photo?: boolean
  mine?: boolean
}

const MINE: FixtureReview = {
  name: 'Jesse Lind',
  handle: 'jclind',
  date: 'Jul 2, 2026',
  rating: 5,
  mine: true,
  text: "Made these twice in one week. The lime crema is doing all the heavy lifting — don't skip it.",
}

const PUBLIC_REVIEWS: FixtureReview[] = [
  {
    name: 'Maria Sanchez',
    handle: 'mariacooks',
    date: 'Jun 28, 2026',
    rating: 5,
    photo: true,
    text: 'Perfect weeknight dinner. I swapped in flour tortillas and doubled the slaw; ready in 25 minutes flat.',
  },
  {
    name: null,
    handle: 'breadwinner',
    date: 'Jun 21, 2026',
    rating: 4,
    text: 'Really good base recipe. The chicken needed a few more minutes than written, but the spice mix is spot on.',
  },
  {
    name: 'Tom Okafor',
    handle: 'tomcooks',
    date: 'Jun 14, 2026',
    rating: null,
    text: "Haven't rated it yet — made it for a crowd and it disappeared before I got a bite. Everyone asked for the recipe.",
  },
]

const DESCRIPTIONS: Record<number, { title: string; body: string }> = {
  1: {
    title: 'V1 · Summary panel + cards',
    body: 'The familiar shape, upgraded: a white panel pairs the big average with per-star bars, rating and writing unify into one composer card (stars invited but optional), and reviews stay as cards with your teal-accented review pinned first. Segmented New/Top control. Lowest-risk evolution of the current layout.',
  },
  2: {
    title: 'V2 · Score band + rows',
    body: 'Editorial and low-chrome: a flat score band between hairlines — big numeral, thin histogram, your-rating block on the right with "Write a review" expanding an inline composer. Reviews become divided rows instead of boxes; sorting is a pair of text tabs. Most content-forward, least boxy.',
  },
  3: {
    title: 'V3 · Invitation first',
    body: 'Participation leads: the section opens by asking "How did it turn out?" in a warm-wash composer with big stars; the score compresses into a summary strip with a reviewer facepile and mini columns; reviews are warm-bordered cards with 40px avatars. After you post, the invitation becomes your review card (see States). Friendliest, boldest departure.',
  },
}

/* ------------------------------------------------------------------ */
/* shared building blocks                                              */
/* ------------------------------------------------------------------ */

const Avatar: FC<{ review: FixtureReview; className: string }> = ({
  review,
  className,
}) =>
  review.photo ? (
    <span className={`${className} drx-photo-sim`} role='img' aria-hidden />
  ) : (
    <DefaultAvatar seed={review.handle} className={className} ariaHidden />
  )

const IdentityLines: FC<{ review: FixtureReview; inlineDate?: boolean }> = ({
  review,
  inlineDate = false,
}) => (
  <div className='drx-who'>
    <div className='drx-nm'>
      {review.name ? (
        review.mine ? (
          review.name
        ) : (
          <a href='#top' onClick={e => e.preventDefault()}>
            {review.name}
          </a>
        )
      ) : (
        <a href='#top' onClick={e => e.preventDefault()}>
          @{review.handle}
        </a>
      )}
      {review.mine && inlineDate && <span className='drx-you'>You</span>}
    </div>
    <div className='drx-sub'>
      {review.name ? `@${review.handle}` : ''}
      {review.name && inlineDate ? ' · ' : ''}
      {inlineDate ? review.date : ''}
    </div>
  </div>
)

const MineActions: FC = () => (
  <div className='drx-mine-acts'>
    <button className='btn btn--ghost' type='button'>
      <EditIcon /> Edit
    </button>
    <button className='btn btn--ghost drx-danger' type='button'>
      <TrashIcon /> Delete
    </button>
  </div>
)

const Kebab: FC = () => (
  <button className='drx-kebab' type='button' aria-label='Review options'>
    <MoreIcon />
  </button>
)

const LoadMore: FC = () => (
  <button className='load-more-btn' type='button'>
    Load more reviews <ChevronDownIcon />
  </button>
)

/** Textarea + live counter (the shared composer body across directions). */
const ComposerBody: FC<{ submitLabel: string; cancel?: boolean }> = ({
  submitLabel,
  cancel = false,
}) => {
  const [text, setText] = useState('')
  const len = text.length
  const counterClass =
    len >= 2000 ? 'drx-count over' : len >= 1900 ? 'drx-count warn' : 'drx-count'
  const counter =
    len >= 2000
      ? '2,000 / 2,000 — limit reached'
      : len > 0 && len < 5
      ? 'Add at least 5 characters'
      : `${len.toLocaleString()} / 2,000`
  return (
    <>
      <textarea
        value={text}
        maxLength={2000}
        onChange={e => setText(e.target.value)}
        placeholder='Share how it turned out…'
        aria-label='Write a review'
      />
      <div className='drx-c-foot'>
        <span className={counterClass}>{counter}</span>
        {cancel && (
          <button className='btn btn--ghost' type='button'>
            Cancel
          </button>
        )}
        <button className='btn btn--primary drx-submit' type='button'>
          {submitLabel}
        </button>
      </div>
    </>
  )
}

const SortToggle: FC<{
  variant: 'seg' | 'tabs' | 'pills'
}> = ({ variant }) => {
  const [sort, setSort] = useState<'new' | 'top'>('new')
  const cls =
    variant === 'seg' ? 'drx-seg' : variant === 'tabs' ? 'drx-tabs' : 'drx-pills'
  return (
    <div className={cls} role='group' aria-label='Sort reviews'>
      {(['new', 'top'] as const).map(s => (
        <button
          key={s}
          type='button'
          className={sort === s ? 'on' : ''}
          aria-pressed={sort === s}
          onClick={() => setSort(s)}
        >
          {s === 'new' ? 'New' : 'Top'}
        </button>
      ))}
    </div>
  )
}

const HistogramRows: FC = () => (
  <div className='drx-bars'>
    {BREAKDOWN.map((count, i) => (
      <div className='drx-hrow' key={i}>
        <span className='drx-hlab'>{5 - i}★</span>
        <div className='drx-htrack'>
          <div
            className='drx-hfill'
            style={{ width: `${(count / MAX_BUCKET) * 100}%` }}
          />
        </div>
        <span className='drx-hcount'>{count}</span>
      </div>
    ))}
  </div>
)

const SkeletonCard: FC<{ avatarSize: number }> = ({ avatarSize }) => (
  <div className='drx-skel' aria-hidden>
    <div className='drx-skel-head'>
      <Skeleton
        circle
        width={avatarSize}
        height={avatarSize}
        baseColor={skeletonBase}
        inline
      />
      <div className='drx-skel-lines'>
        <Skeleton width={110} height={12} baseColor={skeletonBase} inline />
        <Skeleton width={84} height={10} baseColor={skeletonBase} inline />
      </div>
      <Skeleton width={70} height={10} baseColor={skeletonBase} inline />
    </div>
    <Skeleton width='95%' height={11} baseColor={skeletonBase} />
    <Skeleton width='72%' height={11} baseColor={skeletonBase} />
  </div>
)

const StatePanels: FC<{ avatarSize: number; writeAsLink?: boolean }> = ({
  avatarSize,
  writeAsLink = false,
}) => (
  <>
    <div className='drx-spanel'>
      <div className='drx-slab'>Loading — skeleton</div>
      <SkeletonCard avatarSize={avatarSize} />
    </div>
    <div className='drx-spanel'>
      <div className='drx-slab'>Empty — signed in</div>
      <div className='drx-empty'>
        <p>No reviews yet — be the first to share how it turned out.</p>
        {writeAsLink ? (
          <button className='drx-write-link' type='button'>
            Write a review
          </button>
        ) : (
          <button className='btn btn--primary drx-submit' type='button'>
            Write a review
          </button>
        )}
      </div>
    </div>
    <div className='drx-spanel'>
      <div className='drx-slab'>Empty — signed out</div>
      <div className='drx-empty'>
        <p>No reviews yet.</p>
        <a
          className='drx-signin'
          href='#top'
          onClick={e => e.preventDefault()}
        >
          Sign in to rate
        </a>
      </div>
    </div>
    <div className='drx-spanel'>
      <div className='drx-slab'>Owner viewing own recipe</div>
      <div className='drx-owner-note'>
        This is your recipe — you can't leave a rating or review.
      </div>
    </div>
  </>
)

/* ------------------------------------------------------------------ */
/* V1 · Summary panel + cards                                          */
/* ------------------------------------------------------------------ */

const CardReview: FC<{ review: FixtureReview; warm?: boolean }> = ({
  review,
  warm = false,
}) => (
  <article
    className={`drx-rc${review.mine ? ' mine' : ''}${warm ? ' warm' : ''}`}
  >
    <div className='drx-rc-head'>
      <Avatar review={review} className='drx-avatar' />
      <IdentityLines review={review} />
      <span className='drx-dt'>{review.date}</span>
      {!review.mine && <Kebab />}
    </div>
    {review.rating !== null && (
      <div className='drx-rc-stars'>
        <StarRating rating={review.rating} size={14} spacing={1} />
      </div>
    )}
    <p className='drx-rc-text'>{review.text}</p>
    {review.mine && <MineActions />}
  </article>
)

const V1Panel: FC = () => {
  const [myRating, setMyRating] = useState(0)
  return (
    <div className='drx-v1'>
      <div className='drx-sum'>
        <div className='drx-sum-score'>
          <span className='drx-big'>{AVG}</span>
          <StarRating rating={AVG} size={18} spacing={2} />
          <span className='drx-cnt'>{RATE_COUNT} ratings</span>
        </div>
        <HistogramRows />
      </div>

      <div className='drx-compose'>
        <div className='drx-compose-top'>
          <span className='drx-c-title'>Rate this recipe</span>
          <StarRating
            rating={myRating}
            interactive
            onChange={setMyRating}
            ariaLabel='Rate this recipe'
          />
          <span className='drx-c-hint'>
            {myRating > 0 ? `${myRating} / 5` : 'Tap a star — or just write'}
          </span>
        </div>
        <ComposerBody submitLabel='Submit review' />
      </div>

      <div className='drx-toolbar'>
        <span className='drx-n'>5 reviews</span>
        <SortToggle variant='seg' />
      </div>

      <p className='drx-eyebrow'>Your review</p>
      <CardReview review={MINE} />
      {PUBLIC_REVIEWS.map(r => (
        <CardReview review={r} key={r.handle} />
      ))}
      <LoadMore />

      <div className='drx-states'>
        <span className='drx-label'>States · V1</span>
        <div className='drx-sgrid'>
          <StatePanels avatarSize={34} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* V2 · Score band + rows                                              */
/* ------------------------------------------------------------------ */

const RowReview: FC<{ review: FixtureReview }> = ({ review }) => (
  <article className='drx-row'>
    <div className='drx-row-head'>
      <Avatar review={review} className='drx-avatar' />
      <IdentityLines review={review} inlineDate />
      {review.mine ? <MineActions /> : <Kebab />}
    </div>
    <div className='drx-row-body'>
      {review.rating !== null && (
        <div className='drx-rc-stars'>
          <StarRating rating={review.rating} size={14} spacing={1} />
        </div>
      )}
      <p className='drx-rc-text'>{review.text}</p>
    </div>
  </article>
)

const V2Band: FC = () => {
  const [myRating, setMyRating] = useState(0)
  return (
    <div className='drx-v2'>
      <div className='drx-band'>
        <div className='drx-band-score'>
          <span className='drx-big'>{AVG}</span>
          <StarRating rating={AVG} size={16} spacing={2} />
          <span className='drx-cnt'>{RATE_COUNT} ratings</span>
        </div>
        <HistogramRows />
        <div className='drx-band-rate'>
          <p className='drx-eyebrow muted'>Your rating</p>
          <StarRating
            rating={myRating}
            interactive
            onChange={setMyRating}
            size={26}
            ariaLabel='Rate this recipe'
          />
          <button className='drx-write-link' type='button'>
            Write a review
          </button>
        </div>
      </div>

      <div className='drx-v2-compose'>
        <p className='drx-mock-note'>
          (expands from "Write a review" — shown open)
        </p>
        <ComposerBody submitLabel='Submit review' cancel />
      </div>

      <div className='drx-toolbar'>
        <span className='drx-n'>5 reviews</span>
        <SortToggle variant='tabs' />
      </div>

      <div className='drx-rows'>
        <RowReview review={MINE} />
        {PUBLIC_REVIEWS.map(r => (
          <RowReview review={r} key={r.handle} />
        ))}
      </div>
      <LoadMore />

      <div className='drx-states'>
        <span className='drx-label'>States · V2</span>
        <div className='drx-sgrid'>
          <StatePanels avatarSize={38} writeAsLink />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* V3 · Invitation first                                               */
/* ------------------------------------------------------------------ */

const V3Invite: FC = () => {
  const [myRating, setMyRating] = useState(0)
  return (
    <div className='drx-v3'>
      <div className='drx-invite'>
        <h3>How did it turn out?</h3>
        <p className='drx-isub'>Rate it, write a few words, or both.</p>
        <div className='drx-irow'>
          <DefaultAvatar seed='jclind' className='drx-avatar' ariaHidden />
          <StarRating
            rating={myRating}
            interactive
            onChange={setMyRating}
            size={30}
            spacing={3}
            ariaLabel='Rate this recipe'
          />
        </div>
        <ComposerBody submitLabel='Share your review' />
      </div>

      <div className='drx-sumstrip'>
        <div className='drx-ss-score'>
          <span className='drx-big'>{AVG}</span>
          <div>
            <StarRating rating={AVG} size={14} spacing={1} />
            <div className='drx-cnt'>{RATE_COUNT} ratings</div>
          </div>
        </div>
        <div>
          <div
            className='drx-mini'
            role='img'
            aria-label='Rating breakdown, 1 to 5 stars'
          >
            {[...BREAKDOWN].reverse().map((count, i) => (
              <div className='drx-vcol' key={i}>
                <div
                  className='drx-vfill'
                  style={{ height: `${(count / MAX_BUCKET) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className='drx-mini-cap'>1★ → 5★</div>
        </div>
        <div className='drx-pilewrap'>
          <div className='drx-pile'>
            <span className='drx-avatar drx-photo-sim' />
            <DefaultAvatar seed='breadwinner' className='drx-avatar' ariaHidden />
            <DefaultAvatar seed='tomcooks' className='drx-avatar' ariaHidden />
            <DefaultAvatar seed='mariacooks' className='drx-avatar' ariaHidden />
            <span className='drx-more'>+4</span>
          </div>
          <span className='drx-pile-txt'>Rated by 8 cooks</span>
        </div>
      </div>

      <div className='drx-toolbar'>
        <span className='drx-n'>4 reviews</span>
        <SortToggle variant='pills' />
      </div>

      {PUBLIC_REVIEWS.map(r => (
        <CardReview review={r} warm key={r.handle} />
      ))}
      <LoadMore />

      <div className='drx-states'>
        <span className='drx-label'>States · V3</span>
        <div className='drx-sgrid'>
          <div className='drx-spanel'>
            <div className='drx-slab'>
              Your review — after posting (replaces the invitation)
            </div>
            <div className='drx-invite compact'>
              <p className='drx-eyebrow deep'>Your review</p>
              <div className='drx-irow'>
                <DefaultAvatar seed='jclind' className='drx-avatar' ariaHidden />
                <IdentityLines review={MINE} inlineDate />
                <StarRating rating={5} size={14} spacing={1} />
              </div>
              <p className='drx-rc-text'>{MINE.text}</p>
              <MineActions />
            </div>
          </div>
          <StatePanels avatarSize={40} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

const DesignReviews: FC = () => {
  const [variant, setVariant] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        setVariant(Number(e.key) as 1 | 2 | 3)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className='page design-reviews-page' id='top'>
      <div className='drx-banner'>
        Temporary design exploration — §D reviews overhaul (PR-C). Pick a
        direction; this page is unlinked and gets deleted before PR-C merges.
      </div>

      <div className='drx-switcher'>
        {([1, 2, 3] as const).map(v => (
          <button
            key={v}
            type='button'
            className={variant === v ? 'active' : ''}
            onClick={() => setVariant(v)}
          >
            {DESCRIPTIONS[v].title}
          </button>
        ))}
        <span className='drx-hint'>press 1–3 to switch</span>
      </div>
      <div className='drx-desc'>
        <div className='drx-desc-title'>{DESCRIPTIONS[variant].title}</div>
        <p>{DESCRIPTIONS[variant].body}</p>
      </div>

      <div className='drx-context-spacer'>
        recipe content — ingredients · instructions · tags
      </div>

      <section className='drx-section'>
        <h2 className='drx-title'>Ratings &amp; Reviews</h2>
        {variant === 1 && <V1Panel />}
        {variant === 2 && <V2Band />}
        {variant === 3 && <V3Invite />}
      </section>

      <div className='drx-shared'>
        <span className='drx-label'>Shared across directions</span>
        <p className='drx-shared-sub'>
          These keep one design regardless of direction: the delete
          confirmation (react-modal, restyled to the elevation ramp — copy now
          matches the real behavior: deleting the review keeps your star
          rating) and the composer feedback states (live counter, moderation
          rejection). The live counter is real in every composer above — type
          in one.
        </p>
        <div className='drx-sgrid'>
          <div className='drx-spanel'>
            <div className='drx-slab'>Delete confirmation modal</div>
            <div className='drx-modal-frame'>
              <div className='drx-modal'>
                <h5>Delete your review?</h5>
                <p>
                  Your written review will be permanently removed. Your star
                  rating stays until you remove it.
                </p>
                <div className='drx-modal-opts'>
                  <button className='btn btn--outline' type='button'>
                    Cancel
                  </button>
                  <button className='btn btn--danger-solid' type='button'>
                    Delete review
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className='drx-spanel'>
            <div className='drx-slab'>Composer — moderation rejection</div>
            <textarea
              className='drx-invalid'
              readOnly
              value='Absolute garbage recipe, and the author is a [—].'
              aria-label='Rejected review example'
            />
            <p className='drx-err-text'>
              Your review wasn't posted — it may contain language that breaks
              our guidelines. Edit it and try again.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesignReviews
