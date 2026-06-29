// Single source of truth for app icons — one concept, one glyph, one house family.
//
// HOUSE FAMILY: Lucide (react-icons/lu). Every concept below re-exports a Lucide
// glyph under a semantic, set-agnostic name, so the whole app shares one stroke
// weight / grid / corner radius. Call sites import from here only; a Vitest guard
// (src/test/icons-single-source.test.ts) fails the build on any direct
// react-icons/* import outside this folder. To change a concept's glyph, edit its
// one line here and every call site updates with it.
//
// EXCEPTIONS (Lucide ships no brand logos):
//   - GoogleColorIcon — the multicolor Google "G" (Flat Color Icons); the
//     Continue-with-Google button needs the branded color mark.
//   - GoogleIcon — the mono Google "G" (Simple Icons).
//
// FILLED VARIANTS: Lucide is an outline system. Where a concept needs a filled
// counterpart that toggles against its outline (star, bookmark), it's the SAME
// Lucide glyph rendered with fill="currentColor" (see the wrappers at the bottom)
// — so a toggle swaps fill, never glyph shape. Concepts whose fill reads poorly
// (printer, warning triangle) intentionally have no filled variant; emphasis
// there comes from color/size, the Lucide way.
import type { IconType } from 'react-icons'
import React from 'react'
import { LuBookmark, LuStar } from 'react-icons/lu'

export {
  LuCircleAlert as AlertCircleIcon,
  LuTriangleAlert as AlertTriangleIcon,
  LuApple as AppleIcon,
  LuArrowLeft as ArrowLeftIcon,
  LuArrowRight as ArrowRightIcon,
  LuArrowUpRight as ArrowUpRightIcon,
  LuAtSign as AtSignIcon,
  LuAward as AwardIcon,
  LuBeef as BeefIcon,
  LuBookOpen as BookOpenIcon,
  LuBookmark as BookmarkIcon,
  LuBug as BugIcon,
  LuCakeSlice as CakeSliceIcon,
  LuCandy as CandyIcon,
  LuCarrot as CarrotIcon,
  LuMessageCircle as ChatIcon,
  LuCircleCheck as CheckCircleIcon,
  LuCheck as CheckIcon,
  LuChefHat as ChefHatIcon,
  LuCherry as CherryIcon,
  LuChevronDown as ChevronDownIcon,
  LuChevronRight as ChevronRightIcon,
  LuChevronsRight as ChevronsRightIcon,
  LuClock as ClockIcon,
  LuX as CloseIcon,
  LuCloud as CloudIcon,
  LuCoffee as CoffeeIcon,
  LuCookie as CookieIcon,
  LuCookingPot as CookingPotIcon,
  LuCornerDownRight as CornerDownRightIcon,
  LuCroissant as CroissantIcon,
  LuDices as DiceIcon,
  LuDollarSign as DollarSignIcon,
  LuDonut as DonutIcon,
  LuDownload as DownloadIcon,
  LuGripVertical as DragIcon,
  LuPenLine as EditIcon,
  LuEgg as EggIcon,
  LuMail as EmailIcon,
  LuEye as EyeIcon,
  LuEyeOff as EyeOffIcon,
  LuFileText as FileTextIcon,
  LuFish as FishIcon,
  LuFlag as FlagIcon,
  LuFolder as FolderIcon,
  LuFolderPlus as FolderPlusIcon,
  LuGrape as GrapeIcon,
  LuLayoutGrid as GridIcon,
  LuUsers as GroupAddIcon,
  LuHeart as HeartIcon,
  LuCircleHelp as HelpIcon,
  LuHouse as HomeIcon,
  LuIceCreamCone as IceCreamIcon,
  LuInbox as InboxIcon,
  LuInfo as InfoIcon,
  LuCookingPot as KitchenIcon,
  LuLightbulb as LightbulbIcon,
  LuLock as LockIcon,
  LuLogOut as LogOutIcon,
  LuMapPin as MapPinIcon,
  LuEllipsis as MoreIcon,
  LuChartPie as PieChartIcon,
  LuPizza as PizzaIcon,
  LuCirclePlus as PlusCircleIcon,
  LuPlus as PlusIcon,
  LuPrinter as PrinterIcon,
  LuUtensilsCrossed as RecipesMenuIcon,
  LuRotateCw as RotateCwIcon,
  LuSalad as SaladIcon,
  LuSandwich as SandwichIcon,
  LuSearchX as SearchOffIcon,
  LuSearch as SearchIcon,
  LuSettings as SettingsIcon,
  LuShare as ShareIcon,
  LuShield as ShieldIcon,
  LuShoppingBasket as ShoppingBasketIcon,
  LuShoppingCart as ShoppingCartIcon,
  LuSlidersHorizontal as SlidersIcon,
  LuSoup as SoupIcon,
  LuStar as StarOutlineIcon,
  LuAlignLeft as SubjectIcon,
  LuTag as TagIcon,
  LuTrash2 as TrashIcon,
  LuTrendingUp as TrendingUpIcon,
  LuUser as UserIcon,
  LuUtensils as UtensilsIcon,
  LuWheat as WheatIcon,
  LuWrench as WrenchIcon,
} from 'react-icons/lu'

// Brand-mark exceptions — Lucide has no logos (see header).
export { SiGoogle as GoogleIcon } from 'react-icons/si'
export { FcGoogle as GoogleColorIcon } from 'react-icons/fc'

// Filled variants — same Lucide glyph as the outline, filled (see header).
export const StarFilledIcon: IconType = props =>
  React.createElement(LuStar, { fill: 'currentColor', ...props })
export const BookmarkFilledIcon: IconType = props =>
  React.createElement(LuBookmark, { fill: 'currentColor', ...props })

export type { IconType }
