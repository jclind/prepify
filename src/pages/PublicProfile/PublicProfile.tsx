import React, { FC, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { TailSpin } from 'react-loader-spinner'
import './PublicProfile.scss'
import PublicProfileAPI from 'src/api/publicProfile'
import RecipeThumbnail from 'src/Components/RecipeThumbnail/RecipeThumbnail'

const PublicProfile: FC = () => {
  const { username } = useParams<{ username: string }>()
  // Fall back to the initial if the avatar URL fails to load (e.g. a stale or
  // CDN-blocked photoURL) rather than showing a broken image.
  const [avatarError, setAvatarError] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => PublicProfileAPI.getPublicProfile(username as string),
    enabled: !!username,
    retry: false,
  })

  // Reset the avatar fallback when the profile (and its photo) changes.
  useEffect(() => setAvatarError(false), [data?.photoURL])

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

  const initial = data.displayName
    ? data.displayName.charAt(0).toUpperCase()
    : ''
  const metaParts = [
    `@${data.username}`,
    data.location || null,
    `Lv ${data.level} · ${data.rank}`,
  ].filter(Boolean)

  return (
    <div className='page public-profile'>
      <Helmet>
        <meta charSet='utf-8' />
        <title>{data.displayName} | Prepify</title>
      </Helmet>

      <header className='pp-head'>
        {data.photoURL && !avatarError ? (
          <img
            src={data.photoURL}
            alt='Profile avatar'
            className='pp-avatar'
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className='pp-avatar not-set'>{initial}</div>
        )}
        <div className='pp-id'>
          <h1 className='pp-name'>{data.displayName}</h1>
          <p className='pp-meta'>{metaParts.join(' · ')}</p>
          {data.bio && <p className='pp-bio'>{data.bio}</p>}
          {data.achievements.length > 0 && (
            <div className='pp-badges'>
              {data.achievements.map(a => (
                <span key={a.id} className='pp-badge' title={a.description}>
                  🏅 {a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className='pp-recipes'>
        <h2 className='pp-section-title'>
          Recipes
          {data.recipesTotalCount > 0 && (
            <span className='pp-count'>{data.recipesTotalCount}</span>
          )}
        </h2>
        {data.recipes.length > 0 ? (
          <>
            <div className='pp-recipe-grid'>
              {data.recipes.map(recipe => (
                <RecipeThumbnail key={recipe._id} recipe={recipe} />
              ))}
            </div>
            {data.recipesTotalCount > data.recipes.length && (
              <p className='pp-more'>
                Showing {data.recipes.length} of {data.recipesTotalCount} recipes
              </p>
            )}
          </>
        ) : (
          <p className='pp-empty'>
            {data.displayName} hasn’t published any recipes yet.
          </p>
        )}
      </section>
    </div>
  )
}

export default PublicProfile
