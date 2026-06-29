// TEMPORARY — icon-family migration audit (Lucide). Rendered at the temp route
// `/icon-audit` so the owner can compare today's glyphs against the proposed
// single-family (Lucide) candidates before anything is remapped in index.ts.
//
// This file (and the /icon-audit route) is deleted before the PR opens. It lives
// under src/Components/icons/ on purpose: the single-source guard test exempts
// this folder, so it may import from react-icons/* directly to hold BOTH the
// current glyph and the Lucide candidate side by side.
import type { IconType } from 'react-icons'

// --- current glyphs (today's index.ts mapping) ---
import {
  FiAlertCircle, FiAlertTriangle, FiArrowLeft, FiArrowRight, FiArrowUpRight, FiAward,
  FiBookOpen, FiCheck, FiCheckCircle, FiChevronDown, FiChevronRight, FiClock,
  FiCornerDownRight, FiDollarSign, FiDownload, FiEdit3, FiEye, FiEyeOff, FiFileText,
  FiFlag, FiFolder, FiFolderPlus, FiGrid, FiHeart, FiHelpCircle, FiInbox, FiMapPin,
  FiPieChart, FiPlus, FiPlusCircle, FiRotateCw, FiSearch, FiSettings, FiShare,
  FiShield, FiShoppingCart, FiTrash2, FiTrendingUp, FiUser, FiX,
} from 'react-icons/fi'
import {
  AiFillStar, AiFillWarning, AiOutlineCloud, AiOutlineGoogle, AiOutlineHome,
  AiOutlineInfoCircle, AiOutlineStar, AiOutlineUsergroupAdd,
} from 'react-icons/ai'
import { BiBookmark, BiLogOut, BiSliderAlt, BiSolidBookmark, BiWrench } from 'react-icons/bi'
import { BsChevronDoubleRight, BsFillPrinterFill, BsPrinter, BsThreeDots } from 'react-icons/bs'
import { CiShoppingBasket } from 'react-icons/ci'
import { FcGoogle } from 'react-icons/fc'
import { IoDiceOutline } from 'react-icons/io5'
import {
  MdAlternateEmail, MdDragIndicator, MdOutlineBugReport, MdOutlineChatBubbleOutline,
  MdOutlineEmail, MdOutlineLightbulb, MdOutlineLock, MdOutlineRestaurantMenu, MdOutlineSubject,
} from 'react-icons/md'
import { TbChefHat, TbSearchOff, TbTag, TbToolsKitchen2 } from 'react-icons/tb'
import { SiGoogle } from 'react-icons/si'

// --- Lucide candidates ---
import {
  LuCircleAlert, LuTriangleAlert, LuArrowLeft, LuArrowRight, LuArrowUpRight, LuAward,
  LuBookOpen, LuCheck, LuCircleCheck, LuChevronDown, LuChevronRight, LuClock,
  LuCornerDownRight, LuDollarSign, LuDownload, LuPencil, LuPenLine, LuEye, LuEyeOff,
  LuFileText, LuFlag, LuFolder, LuFolderPlus, LuLayoutGrid, LuHeart, LuCircleHelp,
  LuInbox, LuMapPin, LuChartPie, LuPlus, LuCirclePlus, LuRotateCw, LuSearch, LuSettings,
  LuShare, LuShield, LuShoppingCart, LuTrash2, LuTrendingUp, LuUser, LuX,
  LuCloud, LuHouse, LuInfo, LuLogOut, LuSlidersHorizontal, LuWrench, LuChevronsRight,
  LuEllipsis, LuShoppingBasket, LuDices, LuAtSign, LuGripVertical, LuBug, LuMessageCircle,
  LuMail, LuLightbulb, LuLock, LuAlignLeft, LuChefHat, LuSearchX, LuTag,
  LuStar, LuBookmark, LuPrinter, LuUsers, LuUserPlus, LuUtensilsCrossed, LuClipboardList, LuSoup, LuCookingPot,
  LuApple, LuBeef, LuCakeSlice, LuCandy, LuCarrot, LuCherry, LuCoffee, LuCookie,
  LuCroissant, LuDonut, LuEgg, LuFish, LuGrape, LuIceCreamCone, LuPizza, LuSalad,
  LuSandwich, LuWheat, LuUtensils,
} from 'react-icons/lu'

export type Fam = 'fi' | 'ai' | 'bi' | 'bs' | 'ci' | 'fc' | 'io5' | 'md' | 'tb' | 'si' | 'lu'
type Props = Record<string, unknown>

export type AuditRow = {
  concept: string
  before: IconType
  beforeFam: Fam
  after: IconType
  afterFam: Fam
  afterProps?: Props // e.g. { fill: 'currentColor' } for the filled-via-fill trick
  note?: string
  options?: { label: string; Icon: IconType; props?: Props }[] // taste picks
}

// GROUP C — cross-family swaps. These genuinely change appearance; the real win.
export const CROSS_FAMILY: AuditRow[] = [
  { concept: 'CloudIcon', before: AiOutlineCloud, beforeFam: 'ai', after: LuCloud, afterFam: 'lu' },
  { concept: 'HomeIcon', before: AiOutlineHome, beforeFam: 'ai', after: LuHouse, afterFam: 'lu', note: 'Lucide renamed Home→House' },
  { concept: 'InfoIcon', before: AiOutlineInfoCircle, beforeFam: 'ai', after: LuInfo, afterFam: 'lu' },
  { concept: 'LogOutIcon', before: BiLogOut, beforeFam: 'bi', after: LuLogOut, afterFam: 'lu' },
  { concept: 'SlidersIcon', before: BiSliderAlt, beforeFam: 'bi', after: LuSlidersHorizontal, afterFam: 'lu', note: 'Filters button' },
  { concept: 'WrenchIcon', before: BiWrench, beforeFam: 'bi', after: LuWrench, afterFam: 'lu' },
  { concept: 'ChevronsRightIcon', before: BsChevronDoubleRight, beforeFam: 'bs', after: LuChevronsRight, afterFam: 'lu' },
  { concept: 'MoreIcon', before: BsThreeDots, beforeFam: 'bs', after: LuEllipsis, afterFam: 'lu', note: 'kebab menu' },
  { concept: 'ShoppingBasketIcon', before: CiShoppingBasket, beforeFam: 'ci', after: LuShoppingBasket, afterFam: 'lu', note: 'ingredient no-image' },
  { concept: 'DiceIcon', before: IoDiceOutline, beforeFam: 'io5', after: LuDices, afterFam: 'lu', note: 'What should I cook?' },
  { concept: 'AtSignIcon', before: MdAlternateEmail, beforeFam: 'md', after: LuAtSign, afterFam: 'lu' },
  { concept: 'DragIcon', before: MdDragIndicator, beforeFam: 'md', after: LuGripVertical, afterFam: 'lu', note: 'drag handle (standard sub)' },
  { concept: 'BugIcon', before: MdOutlineBugReport, beforeFam: 'md', after: LuBug, afterFam: 'lu' },
  { concept: 'ChatIcon', before: MdOutlineChatBubbleOutline, beforeFam: 'md', after: LuMessageCircle, afterFam: 'lu' },
  { concept: 'EmailIcon', before: MdOutlineEmail, beforeFam: 'md', after: LuMail, afterFam: 'lu' },
  { concept: 'LightbulbIcon', before: MdOutlineLightbulb, beforeFam: 'md', after: LuLightbulb, afterFam: 'lu' },
  { concept: 'LockIcon', before: MdOutlineLock, beforeFam: 'md', after: LuLock, afterFam: 'lu' },
  { concept: 'SubjectIcon', before: MdOutlineSubject, beforeFam: 'md', after: LuAlignLeft, afterFam: 'lu', note: 'Help subject field' },
  { concept: 'ChefHatIcon', before: TbChefHat, beforeFam: 'tb', after: LuChefHat, afterFam: 'lu' },
  { concept: 'SearchOffIcon', before: TbSearchOff, beforeFam: 'tb', after: LuSearchX, afterFam: 'lu', note: 'no recipes found' },
  { concept: 'TagIcon', before: TbTag, beforeFam: 'tb', after: LuTag, afterFam: 'lu', note: 'per-serving price' },
]

// GROUP D — decisions. Filled-via-fill pairs, taste picks (options[]), and the brand exception.
export const DECISIONS: AuditRow[] = [
  // filled/outline pairs become the SAME Lucide glyph, fill toggled
  { concept: 'StarOutlineIcon', before: AiOutlineStar, beforeFam: 'ai', after: LuStar, afterFam: 'lu', note: 'pairs with StarFilled below' },
  { concept: 'StarFilledIcon', before: AiFillStar, beforeFam: 'ai', after: LuStar, afterFam: 'lu', afterProps: { fill: 'currentColor' }, note: 'same glyph as outline, fill="currentColor"' },
  { concept: 'BookmarkIcon', before: BiBookmark, beforeFam: 'bi', after: LuBookmark, afterFam: 'lu', note: 'pairs with BookmarkFilled below' },
  { concept: 'BookmarkFilledIcon', before: BiSolidBookmark, beforeFam: 'bi', after: LuBookmark, afterFam: 'lu', afterProps: { fill: 'currentColor' }, note: 'same glyph as outline, fill="currentColor"' },
  { concept: 'AlertTriangleFilledIcon', before: AiFillWarning, beforeFam: 'ai', after: LuTriangleAlert, afterFam: 'lu', afterProps: { fill: 'currentColor' }, note: 'AddRecipe error — fill for emphasis' },
  { concept: 'PrinterIcon', before: BsPrinter, beforeFam: 'bs', after: LuPrinter, afterFam: 'lu' },
  { concept: 'PrinterFilledIcon', before: BsFillPrinterFill, beforeFam: 'bs', after: LuPrinter, afterFam: 'lu', afterProps: { fill: 'currentColor' }, note: 'fill reads poorly on a printer — option: drop the hover-fill, use plain LuPrinter for both' },
  // taste picks — no exact Lucide match; pick one
  {
    concept: 'GroupAddIcon', before: AiOutlineUsergroupAdd, beforeFam: 'ai', after: LuUserPlus, afterFam: 'lu', note: 'Servings meta — pick one',
    options: [{ label: 'UserPlus', Icon: LuUserPlus }, { label: 'Users', Icon: LuUsers }],
  },
  {
    concept: 'RecipesMenuIcon', before: MdOutlineRestaurantMenu, beforeFam: 'md', after: LuUtensilsCrossed, afterFam: 'lu', note: 'Recipes nav — pick one (keep distinct from Kitchen)',
    options: [{ label: 'UtensilsCrossed', Icon: LuUtensilsCrossed }, { label: 'ClipboardList', Icon: LuClipboardList }, { label: 'Soup', Icon: LuSoup }, { label: 'BookOpen', Icon: LuBookOpen }],
  },
  {
    concept: 'KitchenIcon', before: TbToolsKitchen2, beforeFam: 'tb', after: LuCookingPot, afterFam: 'lu', note: 'recipe placeholder — pick one',
    options: [{ label: 'CookingPot', Icon: LuCookingPot }, { label: 'UtensilsCrossed', Icon: LuUtensilsCrossed }, { label: 'ChefHat', Icon: LuChefHat }],
  },
  {
    concept: 'GoogleIcon (mono)', before: AiOutlineGoogle, beforeFam: 'ai', after: SiGoogle, afterFam: 'si', note: 'brand mark — Lucide has NO logos; Simple Icons or keep AntDesign',
    options: [{ label: 'SiGoogle (si)', Icon: SiGoogle }, { label: 'keep AntDesign', Icon: AiOutlineGoogle }],
  },
  { concept: 'GoogleColorIcon', before: FcGoogle, beforeFam: 'fc', after: FcGoogle, afterFam: 'fc', note: 'KEEP — multicolor brand mark, the one true exception (Continue-with-Google button)' },
]

// GROUP B — Feather → Lucide. Lucide IS Feather's successor; visually 1:1 (a few renames).
export const FEATHER_RENAME: AuditRow[] = [
  { concept: 'AlertCircleIcon', before: FiAlertCircle, beforeFam: 'fi', after: LuCircleAlert, afterFam: 'lu' },
  { concept: 'AlertTriangleIcon', before: FiAlertTriangle, beforeFam: 'fi', after: LuTriangleAlert, afterFam: 'lu' },
  { concept: 'ArrowLeftIcon', before: FiArrowLeft, beforeFam: 'fi', after: LuArrowLeft, afterFam: 'lu' },
  { concept: 'ArrowRightIcon', before: FiArrowRight, beforeFam: 'fi', after: LuArrowRight, afterFam: 'lu' },
  { concept: 'ArrowUpRightIcon', before: FiArrowUpRight, beforeFam: 'fi', after: LuArrowUpRight, afterFam: 'lu' },
  { concept: 'AwardIcon', before: FiAward, beforeFam: 'fi', after: LuAward, afterFam: 'lu' },
  { concept: 'BookOpenIcon', before: FiBookOpen, beforeFam: 'fi', after: LuBookOpen, afterFam: 'lu' },
  { concept: 'CheckIcon', before: FiCheck, beforeFam: 'fi', after: LuCheck, afterFam: 'lu' },
  { concept: 'CheckCircleIcon', before: FiCheckCircle, beforeFam: 'fi', after: LuCircleCheck, afterFam: 'lu' },
  { concept: 'ChevronDownIcon', before: FiChevronDown, beforeFam: 'fi', after: LuChevronDown, afterFam: 'lu' },
  { concept: 'ChevronRightIcon', before: FiChevronRight, beforeFam: 'fi', after: LuChevronRight, afterFam: 'lu' },
  { concept: 'ClockIcon', before: FiClock, beforeFam: 'fi', after: LuClock, afterFam: 'lu' },
  { concept: 'CornerDownRightIcon', before: FiCornerDownRight, beforeFam: 'fi', after: LuCornerDownRight, afterFam: 'lu' },
  { concept: 'DollarSignIcon', before: FiDollarSign, beforeFam: 'fi', after: LuDollarSign, afterFam: 'lu' },
  { concept: 'DownloadIcon', before: FiDownload, beforeFam: 'fi', after: LuDownload, afterFam: 'lu' },
  { concept: 'EditIcon', before: FiEdit3, beforeFam: 'fi', after: LuPencil, afterFam: 'lu', note: 'FiEdit3≈LuPencil; LuPenLine even closer', options: [{ label: 'Pencil', Icon: LuPencil }, { label: 'PenLine', Icon: LuPenLine }] },
  { concept: 'EyeIcon', before: FiEye, beforeFam: 'fi', after: LuEye, afterFam: 'lu' },
  { concept: 'EyeOffIcon', before: FiEyeOff, beforeFam: 'fi', after: LuEyeOff, afterFam: 'lu' },
  { concept: 'FileTextIcon', before: FiFileText, beforeFam: 'fi', after: LuFileText, afterFam: 'lu' },
  { concept: 'FlagIcon', before: FiFlag, beforeFam: 'fi', after: LuFlag, afterFam: 'lu' },
  { concept: 'FolderIcon', before: FiFolder, beforeFam: 'fi', after: LuFolder, afterFam: 'lu' },
  { concept: 'FolderPlusIcon', before: FiFolderPlus, beforeFam: 'fi', after: LuFolderPlus, afterFam: 'lu' },
  { concept: 'GridIcon', before: FiGrid, beforeFam: 'fi', after: LuLayoutGrid, afterFam: 'lu', note: 'near-match (FiGrid 2×2 vs LayoutGrid)' },
  { concept: 'HeartIcon', before: FiHeart, beforeFam: 'fi', after: LuHeart, afterFam: 'lu' },
  { concept: 'HelpIcon', before: FiHelpCircle, beforeFam: 'fi', after: LuCircleHelp, afterFam: 'lu' },
  { concept: 'InboxIcon', before: FiInbox, beforeFam: 'fi', after: LuInbox, afterFam: 'lu' },
  { concept: 'MapPinIcon', before: FiMapPin, beforeFam: 'fi', after: LuMapPin, afterFam: 'lu' },
  { concept: 'PieChartIcon', before: FiPieChart, beforeFam: 'fi', after: LuChartPie, afterFam: 'lu', note: 'Lucide renamed PieChart→ChartPie' },
  { concept: 'PlusIcon', before: FiPlus, beforeFam: 'fi', after: LuPlus, afterFam: 'lu' },
  { concept: 'PlusCircleIcon', before: FiPlusCircle, beforeFam: 'fi', after: LuCirclePlus, afterFam: 'lu' },
  { concept: 'RotateCwIcon', before: FiRotateCw, beforeFam: 'fi', after: LuRotateCw, afterFam: 'lu' },
  { concept: 'SearchIcon', before: FiSearch, beforeFam: 'fi', after: LuSearch, afterFam: 'lu' },
  { concept: 'SettingsIcon', before: FiSettings, beforeFam: 'fi', after: LuSettings, afterFam: 'lu' },
  { concept: 'ShareIcon', before: FiShare, beforeFam: 'fi', after: LuShare, afterFam: 'lu' },
  { concept: 'ShieldIcon', before: FiShield, beforeFam: 'fi', after: LuShield, afterFam: 'lu' },
  { concept: 'ShoppingCartIcon', before: FiShoppingCart, beforeFam: 'fi', after: LuShoppingCart, afterFam: 'lu' },
  { concept: 'TrashIcon', before: FiTrash2, beforeFam: 'fi', after: LuTrash2, afterFam: 'lu' },
  { concept: 'TrendingUpIcon', before: FiTrendingUp, beforeFam: 'fi', after: LuTrendingUp, afterFam: 'lu' },
  { concept: 'UserIcon', before: FiUser, beforeFam: 'fi', after: LuUser, afterFam: 'lu' },
  { concept: 'CloseIcon', before: FiX, beforeFam: 'fi', after: LuX, afterFam: 'lu' },
]

// Already Lucide — no change. The brand's most distinctive icons are already one family.
export const ALREADY_LUCIDE: { concept: string; Icon: IconType }[] = [
  { concept: 'AppleIcon', Icon: LuApple }, { concept: 'BeefIcon', Icon: LuBeef },
  { concept: 'CakeSliceIcon', Icon: LuCakeSlice }, { concept: 'CandyIcon', Icon: LuCandy },
  { concept: 'CarrotIcon', Icon: LuCarrot }, { concept: 'CherryIcon', Icon: LuCherry },
  { concept: 'CoffeeIcon', Icon: LuCoffee }, { concept: 'CookieIcon', Icon: LuCookie },
  { concept: 'CookingPotIcon', Icon: LuCookingPot }, { concept: 'CroissantIcon', Icon: LuCroissant },
  { concept: 'DonutIcon', Icon: LuDonut }, { concept: 'EggIcon', Icon: LuEgg },
  { concept: 'FishIcon', Icon: LuFish }, { concept: 'GrapeIcon', Icon: LuGrape },
  { concept: 'IceCreamIcon', Icon: LuIceCreamCone }, { concept: 'PizzaIcon', Icon: LuPizza },
  { concept: 'SaladIcon', Icon: LuSalad }, { concept: 'SandwichIcon', Icon: LuSandwich },
  { concept: 'SoupIcon', Icon: LuSoup }, { concept: 'UtensilsIcon', Icon: LuUtensils },
  { concept: 'WheatIcon', Icon: LuWheat },
]
