import React, { FC } from 'react'
import { IconType } from 'react-icons'
import {
  LuApple,
  LuCarrot,
  LuCroissant,
  LuCookie,
  LuPizza,
  LuSoup,
  LuSalad,
  LuEgg,
  LuFish,
  LuBeef,
  LuCakeSlice,
  LuCoffee,
  LuIceCreamCone,
  LuCherry,
  LuGrape,
  LuSandwich,
  LuDonut,
  LuCookingPot,
  LuWheat,
  LuCandy,
} from 'react-icons/lu'
import { getDefaultAvatar, AvatarIcon } from 'src/util/defaultAvatar'
import './DefaultAvatar.scss'

const ICONS: Record<AvatarIcon, IconType> = {
  apple: LuApple,
  carrot: LuCarrot,
  croissant: LuCroissant,
  cookie: LuCookie,
  pizza: LuPizza,
  soup: LuSoup,
  salad: LuSalad,
  egg: LuEgg,
  fish: LuFish,
  beef: LuBeef,
  cakeSlice: LuCakeSlice,
  coffee: LuCoffee,
  iceCream: LuIceCreamCone,
  cherry: LuCherry,
  grape: LuGrape,
  sandwich: LuSandwich,
  donut: LuDonut,
  cookingPot: LuCookingPot,
  wheat: LuWheat,
  candy: LuCandy,
}

type DefaultAvatarProps = {
  // Stable identity (username) so the icon/colour is consistent per user.
  seed: string | null | undefined
  // The avatar slot's existing class — supplies size + border-radius.
  className?: string
  // Accessible label; omit / pass ariaHidden when a sibling already names it.
  title?: string
  ariaHidden?: boolean
}

/**
 * Default avatar for users with no photo: a deterministic food line-icon (darker
 * shade) on a light tint of the same hue — a tasteful, near-monochrome look.
 * The icon scales to whatever size the passed-in className gives the tile.
 */
const DefaultAvatar: FC<DefaultAvatarProps> = ({
  seed,
  className = '',
  title,
  ariaHidden,
}) => {
  const { icon, bg, fg } = getDefaultAvatar(seed)
  const Icon = ICONS[icon]
  return (
    <span
      className={`default-avatar ${className}`}
      style={{ background: bg, color: fg }}
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : title || 'Default avatar'}
      aria-hidden={ariaHidden || undefined}
    >
      <Icon className='default-avatar__icon' />
    </span>
  )
}

export default DefaultAvatar
