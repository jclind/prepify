import { AppleIcon, BeefIcon, CakeSliceIcon, CandyIcon, CarrotIcon, CherryIcon, CoffeeIcon, CookieIcon, CookingPotIcon, CroissantIcon, DonutIcon, EggIcon, FishIcon, GrapeIcon, IceCreamIcon, PizzaIcon, SaladIcon, SandwichIcon, SoupIcon, WheatIcon, IconType } from 'src/Components/icons'
import React, { FC } from 'react'
import { getDefaultAvatar, AvatarIcon } from 'src/util/defaultAvatar'
import './DefaultAvatar.scss'

const ICONS: Record<AvatarIcon, IconType> = {
  apple: AppleIcon,
  carrot: CarrotIcon,
  croissant: CroissantIcon,
  cookie: CookieIcon,
  pizza: PizzaIcon,
  soup: SoupIcon,
  salad: SaladIcon,
  egg: EggIcon,
  fish: FishIcon,
  beef: BeefIcon,
  cakeSlice: CakeSliceIcon,
  coffee: CoffeeIcon,
  iceCream: IceCreamIcon,
  cherry: CherryIcon,
  grape: GrapeIcon,
  sandwich: SandwichIcon,
  donut: DonutIcon,
  cookingPot: CookingPotIcon,
  wheat: WheatIcon,
  candy: CandyIcon,
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
