import React, { FC, useEffect, useState } from 'react'
import DefaultAvatar from 'src/Components/DefaultAvatar/DefaultAvatar'

type UserAvatarProps = {
  // Auth photo, if the user has one; null/undefined falls straight to the
  // DefaultAvatar treatment.
  photoURL?: string | null
  // Stable identity (username) for the deterministic DefaultAvatar fallback.
  seed: string | null | undefined
  // The avatar slot's existing class — supplies size + border-radius, exactly
  // like DefaultAvatar's contract.
  className?: string
  // Accessible label; omit / pass ariaHidden when a sibling already names it.
  title?: string
  ariaHidden?: boolean
}

/**
 * A user's avatar: their photo when one is set and loads, otherwise the
 * deterministic DefaultAvatar. Owns the img-onError fallback so consumers
 * don't each re-implement the photo/fallback branch.
 */
const UserAvatar: FC<UserAvatarProps> = ({
  photoURL,
  seed,
  className = '',
  title,
  ariaHidden,
}) => {
  const [imgFailed, setImgFailed] = useState(false)

  // A new photo URL deserves a fresh attempt (e.g. the same slot re-rendered
  // for a different reviewer via a list key reuse).
  useEffect(() => {
    setImgFailed(false)
  }, [photoURL])

  if (photoURL && !imgFailed) {
    return (
      <img
        className={`user-avatar ${className}`}
        src={photoURL}
        alt={ariaHidden ? '' : title || 'User avatar'}
        aria-hidden={ariaHidden || undefined}
        onError={() => setImgFailed(true)}
      />
    )
  }
  return (
    <DefaultAvatar
      seed={seed}
      className={className}
      title={title}
      ariaHidden={ariaHidden}
    />
  )
}

export default UserAvatar
