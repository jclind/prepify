import { AwardIcon, BookOpenIcon, BookmarkIcon, ClockIcon, MapPinIcon, ShareIcon, StarOutlineIcon } from 'src/Components/icons'
import React, { FC, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import toast from 'react-hot-toast'
import './PublicProfile.scss'
import PublicProfileAPI from 'src/api/publicProfile'
import AuthAPI from 'src/api/auth'
import ReportControl from 'src/Components/ReportControl/ReportControl'
import EmptyState from 'src/Components/EmptyState/EmptyState'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'
import { formatRating } from 'src/util/formatRating'
import { formatCompactCount } from 'src/util/formatCompactCount'
import { formatPrice } from 'src/util/formatPrice'
import {
  PROFILE_LINK_COPIED,
  PROFILE_LINK_COPY_ERROR,
} from 'src/util/toastMessages'
import { SITE_URL, DEFAULT_OG_IMAGE } from 'src/util/seo'
import { RecipeType } from 'types'

// Page size for "load more". Matches the server's initial-batch limit so the
// first extra page (page 1) picks up exactly where the profile payload ended.
const PROFILE_PAGE_SIZE = 12

const PublicProfile: FC = () => {
  const { username } = useParams<{ username: string }>()
  // Fall back to the initial if the avatar URL fails to load (e.g. a stale or
  // CDN-blocked photoURL) rather than showing a broken image.
  const [avatarError, setAvatarError] = useState(false)

  // Recipes loaded beyond the profile payload's initial batch, keyed by server
  // page number. Keying by page (rather than blindly appending) makes the
  // accumulation idempotent: a re-fetch of a page overwrites its slot instead of
  // duplicating recipes. `extraPage` is the next page to request (0 = none yet;
  // the profile payload is effectively page 0).
  const [extraPages, setExtraPages] = useState<Record<number, RecipeType[]>>({})
  const [extraPage, setExtraPage] = useState(0)

  // The viewer's own handle, so we can hide the "report" control on their own
  // profile. Only fetched when signed in; logged-out visitors still see the
  // control (clicking it prompts them to log in).
  const currentUid = AuthAPI.getUID()
  const { data: currentUsername } = useQuery({
    queryKey: ['username', currentUid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!currentUid,
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => PublicProfileAPI.getPublicProfile(username as string),
    enabled: !!username,
    retry: false,
    // A profile is static within a viewing session; don't refetch on window
    // focus (which would also churn the recipe accumulation below).
    refetchOnWindowFocus: false,
  })

  // Reset the avatar fallback when the profile (and its photo) changes.
  useEffect(() => setAvatarError(false), [data?.photoURL])

  // Reset paging whenever the username changes — e.g. navigating to a different
  // profile — so we don't carry one cook's extra recipes onto another's page.
  useEffect(() => {
    setExtraPages({})
    setExtraPage(0)
  }, [username])

  const { data: moreData, isFetching: isLoadingMore } = useQuery({
    queryKey: ['public-profile-recipes', username, extraPage],
    queryFn: () =>
      PublicProfileAPI.getPublicProfileRecipes(
        username as string,
        extraPage,
        PROFILE_PAGE_SIZE
      ),
    enabled: !!username && extraPage > 0,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (moreData?.recipes) {
      setExtraPages(prev => ({ ...prev, [extraPage]: moreData.recipes }))
    }
  }, [moreData, extraPage])

  const handleShare = async () => {
    const url = window.location.href
    const title = data ? `${data.displayName} on Prepify` : 'Prepify'
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        return
      }
    } catch {
      // User dismissed the share sheet, or it failed — fall through to copy.
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success(PROFILE_LINK_COPIED)
    } catch {
      toast.error(PROFILE_LINK_COPY_ERROR)
    }
  }

  if (isLoading) {
    return (
      <div className='page public-profile pp-centered'>
        <TailSpin height='40' width='40' color='#ff5722' ariaLabel='loading' />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className='page public-profile pp-centered'>
        <Helmet>
          <title>Profile not found · Prepify</title>
          <meta name='robots' content='noindex' />
        </Helmet>
        <div className='pp-notfound'>
          <h1>Profile not found</h1>
          <p>We couldn’t find a cook with the username “{username}”.</p>
          <Link to='/recipes' className='pp-browse-btn'>
            Browse recipes
          </Link>
        </div>
      </div>
    )
  }

  const profile = data

  // The grid shows the profile payload's initial batch plus any "load more"
  // pages, ordered by page number.
  const extraRecipes = Object.keys(extraPages)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap(p => extraPages[p])
  const shownRecipes = [...profile.recipes, ...extraRecipes]
  const hasMore = shownRecipes.length < profile.recipesTotalCount

  // Social/meta values for this profile.
  const profileTitle = `${profile.displayName} (@${profile.username}) · Prepify`
  const profileUrl = `${SITE_URL}/u/${profile.username}`
  const profileDescription =
    profile.bio?.trim() ||
    `${profile.displayName}'s budget-friendly, healthy recipes on Prepify — with meal price and nutrition info.`
  const profileImage = profile.photoURL || DEFAULT_OG_IMAGE

  return (
    <div className='page public-profile'>
      <Helmet>
        <meta charSet='utf-8' />
        <title>{profileTitle}</title>
        <meta name='description' content={profileDescription} />
        <link rel='canonical' href={profileUrl} />
        {/* Sole live-head meta source for this route (static index.html copies
            are stripped on JS boot). */}
        <meta property='og:type' content='profile' />
        <meta property='og:title' content={profileTitle} />
        <meta property='og:description' content={profileDescription} />
        <meta property='og:image' content={profileImage} />
        <meta property='og:url' content={profileUrl} />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content={profileTitle} />
        <meta name='twitter:description' content={profileDescription} />
        <meta name='twitter:image' content={profileImage} />
      </Helmet>

      <header className='pp-head'>
        {profile.photoURL && !avatarError ? (
          <img
            src={profile.photoURL}
            alt='Profile avatar'
            className='pp-avatar'
            onError={() => setAvatarError(true)}
          />
        ) : (
          <DefaultAvatar
            seed={profile.username}
            className='pp-avatar not-set'
            title={`${profile.displayName} avatar`}
          />
        )}

        <div className='pp-handle-row'>
          <h1 className='pp-handle'>@{profile.username}</h1>
          <button
            type='button'
            className='pp-share'
            onClick={handleShare}
            aria-label='Share this profile'
            title='Share this profile'
          >
            <ShareIcon />
          </button>
          {/* Kebab menu with "Report user" — hidden on the viewer's own profile. */}
          {currentUsername !== profile.username && (
            <ReportControl
              variant='menu'
              target={{
                targetType: 'user',
                reportedUsername: profile.username,
              }}
            />
          )}
        </div>
        <p className='pp-name'>{profile.displayName}</p>

        <div className='pp-counts'>
          <div>
            <b>{formatCompactCount(profile.recipesTotalCount)}</b>
            <span>Recipes</span>
          </div>
          <div className='pp-div' />
          <div>
            <b>{formatCompactCount(profile.recipesSavesTotal)}</b>
            <span>Saves</span>
          </div>
          <div className='pp-div' />
          <div>
            <b>{formatCompactCount(profile.recipesMadeTotal)}</b>
            <span>Made</span>
          </div>
        </div>

        {profile.bio && <p className='pp-bio'>{profile.bio}</p>}

        <p className='pp-loc'>
          {profile.location && (
            <>
              <MapPinIcon /> {profile.location}
              <span className='pp-sep'>·</span>
            </>
          )}
          <span className='pp-lvl' title={profile.rank}>
            Lv {profile.level}
          </span>
        </p>

        {profile.achievements.length > 0 && (
          <div className='pp-badges'>
            {profile.achievements.map(a => (
              <span key={a.id} className='pp-badge' title={a.description}>
                <AwardIcon /> {a.name}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className='pp-recipes'>
        {shownRecipes.length > 0 ? (
          <>
            <div className='pp-grid'>
              {shownRecipes.map(recipe => {
                const rated = recipe.rating.rateCount > 0
                const cost =
                  recipe.servingPrice != null
                    ? formatPrice(recipe.servingPrice)
                    : null
                return (
                  <Link
                    key={recipe._id}
                    to={`/recipes/${recipe._id}`}
                    className='pp-tile'
                  >
                    <div className='pp-tile-media'>
                      {recipe.recipeImage ? (
                        <img
                          src={recipe.recipeImage}
                          alt={recipe.title}
                          loading='lazy'
                          decoding='async'
                        />
                      ) : (
                        // No image on the recipe — show a neutral placeholder
                        // rather than a broken-image icon.
                        <div className='pp-tile-noimg'>
                          <BookOpenIcon />
                        </div>
                      )}
                      {(recipe.numTimesSaved ?? 0) > 0 && (
                        <span className='pp-tile-saves'>
                          <BookmarkIcon /> {formatCompactCount(recipe.numTimesSaved)}
                        </span>
                      )}
                    </div>
                    <div className='pp-tile-body'>
                      <h3 className='pp-tile-title'>{recipe.title}</h3>
                      <div className='pp-tile-meta'>
                        <span className='pp-tile-stat'>
                          <StarOutlineIcon />{' '}
                          {rated
                            ? formatRating(
                                recipe.rating.rateValue,
                                recipe.rating.rateCount
                              )
                            : 'New'}
                        </span>
                        <span className='pp-tile-stat'>
                          <ClockIcon /> {recipe.totalTime}m
                        </span>
                        {cost && (
                          <span className='pp-tile-stat pp-tile-cost'>
                            {cost}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            {hasMore && (
              <div className='pp-more'>
                <button
                  type='button'
                  className='load-more-btn btn'
                  onClick={() => setExtraPage(p => p + 1)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading…' : 'Load more recipes'}
                </button>
                <p className='pp-more-count'>
                  Showing {shownRecipes.length} of {profile.recipesTotalCount}
                </p>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<BookOpenIcon />}
            title='No recipes yet'
            description={`${profile.displayName} hasn’t published any recipes yet — check back soon.`}
          />
        )}
      </section>
    </div>
  )
}

export default PublicProfile
