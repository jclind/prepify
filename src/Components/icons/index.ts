// Single source of truth for app icons — one icon per concept.
//
// Every UI concept is exported here under a semantic, set-agnostic name so call
// sites never import from 'react-icons/*' directly and the same concept can't
// drift across icon families again (a Vitest guard enforces this — see
// src/test/icons-single-source.test.ts). To change a concept's glyph, edit the
// single re-export below and every call site updates with it.
//
// Generated/curated during the Wave 2 design sweep ("one icon per concept").
import type { IconType } from 'react-icons'

export {
  FiAlertCircle as AlertCircleIcon,
  FiAlertTriangle as AlertTriangleIcon,
  FiArrowLeft as ArrowLeftIcon,
  FiArrowRight as ArrowRightIcon,
  FiArrowUpRight as ArrowUpRightIcon,
  FiAward as AwardIcon,
  FiBookOpen as BookOpenIcon,
  FiBookmark as BookmarkIcon,
  FiCheck as CheckIcon,
  FiCheckCircle as CheckCircleIcon,
  FiChevronDown as ChevronDownIcon,
  FiChevronRight as ChevronRightIcon,
  FiClock as ClockIcon,
  FiCornerDownRight as CornerDownRightIcon,
  FiDollarSign as DollarSignIcon,
  FiDownload as DownloadIcon,
  FiEdit3 as EditIcon,
  FiEye as EyeIcon,
  FiEyeOff as EyeOffIcon,
  FiFileText as FileTextIcon,
  FiFlag as FlagIcon,
  FiFolder as FolderIcon,
  FiFolderPlus as FolderPlusIcon,
  FiGrid as GridIcon,
  FiHeart as HeartIcon,
  FiHelpCircle as HelpIcon,
  FiInbox as InboxIcon,
  FiMapPin as MapPinIcon,
  FiPieChart as PieChartIcon,
  FiPlus as PlusIcon,
  FiPlusCircle as PlusCircleIcon,
  FiRotateCw as RotateCwIcon,
  FiSearch as SearchIcon,
  FiSettings as SettingsIcon,
  FiShare as ShareIcon,
  FiShield as ShieldIcon,
  FiShoppingCart as ShoppingCartIcon,
  FiStar as StarOutlineIcon,
  FiTrash2 as TrashIcon,
  FiTrendingUp as TrendingUpIcon,
  FiUser as UserIcon,
  FiX as CloseIcon,
} from 'react-icons/fi'
export {
  AiFillStar as StarFilledIcon,
  AiOutlineCloud as CloudIcon,
  AiOutlineGoogle as GoogleIcon,
  AiOutlineHome as HomeIcon,
  AiOutlineInfoCircle as InfoIcon,
  AiOutlineUsergroupAdd as GroupAddIcon,
} from 'react-icons/ai'
export {
  BiLogOut as LogOutIcon,
  BiSliderAlt as SlidersIcon,
  BiSolidBookmark as BookmarkFilledIcon,
  BiWrench as WrenchIcon,
} from 'react-icons/bi'
export {
  BsChevronDoubleRight as ChevronsRightIcon,
  BsFillPrinterFill as PrinterFilledIcon,
  BsPrinter as PrinterIcon,
  BsThreeDots as MoreIcon,
} from 'react-icons/bs'
export {
  CiShoppingBasket as ShoppingBasketIcon,
} from 'react-icons/ci'
export {
  FcGoogle as GoogleColorIcon,
} from 'react-icons/fc'
export {
  IoDiceOutline as DiceIcon,
} from 'react-icons/io5'
export {
  LuApple as AppleIcon,
  LuBeef as BeefIcon,
  LuCakeSlice as CakeSliceIcon,
  LuCandy as CandyIcon,
  LuCarrot as CarrotIcon,
  LuCherry as CherryIcon,
  LuCoffee as CoffeeIcon,
  LuCookie as CookieIcon,
  LuCookingPot as CookingPotIcon,
  LuCroissant as CroissantIcon,
  LuDonut as DonutIcon,
  LuEgg as EggIcon,
  LuFish as FishIcon,
  LuGrape as GrapeIcon,
  LuIceCreamCone as IceCreamIcon,
  LuPizza as PizzaIcon,
  LuSalad as SaladIcon,
  LuSandwich as SandwichIcon,
  LuSoup as SoupIcon,
  LuUtensils as UtensilsIcon,
  LuWheat as WheatIcon,
} from 'react-icons/lu'
export {
  MdAlternateEmail as AtSignIcon,
  MdDragIndicator as DragIcon,
  MdOutlineBugReport as BugIcon,
  MdOutlineChatBubbleOutline as ChatIcon,
  MdOutlineEmail as EmailIcon,
  MdOutlineLightbulb as LightbulbIcon,
  MdOutlineLock as LockIcon,
  MdOutlineRestaurantMenu as RecipesMenuIcon,
  MdOutlineSubject as SubjectIcon,
} from 'react-icons/md'
export {
  TbChefHat as ChefHatIcon,
  TbSearchOff as SearchOffIcon,
  TbTag as TagIcon,
  TbToolsKitchen2 as KitchenIcon,
} from 'react-icons/tb'

export type { IconType }
