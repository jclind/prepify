import React, { FC, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import AuthProvider from 'src/context/AuthContext'

import Home from 'src/pages/Home/Home'
import Recipes from 'src/pages/Recipes/Recipes'
import Login from 'src/pages/Login/Login'
import Signup from 'src/pages/Signup/Signup'
import ForgotPassword from 'src/pages/ForgotPassword/ForgotPassword'
import PrivateRoute from 'src/Components/PrivateRoute'
import CreateUsername from 'src/pages/CreateUsername/CreateUsername'

import Account from 'src/pages/Account/Account'
import SavedRecipes from 'src/pages/Account/SavedRecipes/SavedRecipes'
import UserRatings from 'src/pages/Account/UserRatings/UserRatings'
import UserRecipes from 'src/pages/Account/UserRecipes/UserRecipes'

import AddRecipe from 'src/pages/AddRecipe/AddRecipe'
import Layout from 'src/Components/Layout/Layout'
import Help from 'src/pages/Help/Help'
import NotFound from 'src/pages/404/404'
import SingleRecipe from 'src/pages/SingleRecipe/SingleRecipe'

import HomeDiscover from 'src/pages/HomeVariants/HomeDiscover'
import HomeCook from 'src/pages/HomeVariants/HomeCook'
import HomePlan from 'src/pages/HomeVariants/HomePlan'
import HomeClassic from 'src/pages/HomeVariants/HomeClassic'
import HomeClassicPulse from 'src/pages/HomeVariants/HomeClassicPulse'
import HomeClassicCurated from 'src/pages/HomeVariants/HomeClassicCurated'
import HomeClassicMosaic from 'src/pages/HomeVariants/HomeClassicMosaic'
import HomeClassicShelves from 'src/pages/HomeVariants/HomeClassicShelves'
import HomeSplit from 'src/pages/HomeVariants/HomeSplit'
import HomeCarousel from 'src/pages/HomeVariants/HomeCarousel'
import HomeStats from 'src/pages/HomeVariants/HomeStats'
import HomeSearch from 'src/pages/HomeVariants/HomeSearch'
import HomePantry from 'src/pages/HomeVariants/HomePantry'
import HomeFeed from 'src/pages/HomeVariants/HomeFeed'
import HomeAtlas from 'src/pages/HomeVariants/HomeAtlas'
import HomeChat from 'src/pages/HomeVariants/HomeChat'
import HomeForecast from 'src/pages/HomeVariants/HomeForecast'

// Batch 2 — filled-in (same vibe as the original home)
import HomeWarm from 'src/pages/HomeVariants/v2/HomeWarm'
import HomeEditorial from 'src/pages/HomeVariants/v2/HomeEditorial'
import HomeRows from 'src/pages/HomeVariants/v2/HomeRows'
import HomeSpotlight from 'src/pages/HomeVariants/v2/HomeSpotlight'
import HomeBrowse from 'src/pages/HomeVariants/v2/HomeBrowse'
import HomeMinimal from 'src/pages/HomeVariants/v2/HomeMinimal'
import HomeSeasonal from 'src/pages/HomeVariants/v2/HomeSeasonal'
import HomeCollections from 'src/pages/HomeVariants/v2/HomeCollections'
import HomeMagazine from 'src/pages/HomeVariants/v2/HomeMagazine'
import HomeBistro from 'src/pages/HomeVariants/v2/HomeBistro'

// Batch 2 — feature-forward
import HomePlanner from 'src/pages/HomeVariants/v2/HomePlanner'
import HomeBudget from 'src/pages/HomeVariants/v2/HomeBudget'
import HomeForYou from 'src/pages/HomeVariants/v2/HomeForYou'
import HomeTimer from 'src/pages/HomeVariants/v2/HomeTimer'
import HomeShopping from 'src/pages/HomeVariants/v2/HomeShopping'
import HomeCommunity from 'src/pages/HomeVariants/v2/HomeCommunity'
import HomeNutrition from 'src/pages/HomeVariants/v2/HomeNutrition'
import HomeSurprise from 'src/pages/HomeVariants/v2/HomeSurprise'
import HomeMood from 'src/pages/HomeVariants/v2/HomeMood'
import HomeAssistant from 'src/pages/HomeVariants/v2/HomeAssistant'

import RecipePolished from 'src/pages/RecipeVariants/RecipePolished'
// Batch A — polished+ (rating styles, nutrition, stats, "made by you" toggle)
import RecipePolishedPlus from 'src/pages/RecipeVariants/RecipePolishedPlus'
import RecipePolishedRail from 'src/pages/RecipeVariants/RecipePolishedRail'
import RecipeDashboard from 'src/pages/RecipeVariants/RecipeDashboard'
import RecipeFeature from 'src/pages/RecipeVariants/RecipeFeature'
import RecipeStudio from 'src/pages/RecipeVariants/RecipeStudio'
// Batch B — polished versions of the current single-recipe page
import RecipeClassic from 'src/pages/RecipeVariants/RecipeClassic'
import RecipeClassicWarm from 'src/pages/RecipeVariants/RecipeClassicWarm'
import RecipeClassicBordered from 'src/pages/RecipeVariants/RecipeClassicBordered'
import RecipeClassicCentered from 'src/pages/RecipeVariants/RecipeClassicCentered'
import RecipeClassicCompact from 'src/pages/RecipeVariants/RecipeClassicCompact'
// Bordered family — 5 variations on Classic Bordered (ingredient images + tinted owner banner)
import RecipeBorderedRefined from 'src/pages/RecipeVariants/RecipeBorderedRefined'
import RecipeBorderedAccent from 'src/pages/RecipeVariants/RecipeBorderedAccent'
import RecipeBorderedTeal from 'src/pages/RecipeVariants/RecipeBorderedTeal'
import RecipeBorderedSplit from 'src/pages/RecipeVariants/RecipeBorderedSplit'
import RecipeBorderedSoft from 'src/pages/RecipeVariants/RecipeBorderedSoft'
import RecipeBorderedSoftPlus from 'src/pages/RecipeVariants/RecipeBorderedSoftPlus'
// Soft+ header rethinks
import RecipeSoftStrip from 'src/pages/RecipeVariants/RecipeSoftStrip'
import RecipeSoftOverlay from 'src/pages/RecipeVariants/RecipeSoftOverlay'
import RecipeSoftToolbar from 'src/pages/RecipeVariants/RecipeSoftToolbar'
import RecipeSoftBar from 'src/pages/RecipeVariants/RecipeSoftBar'
import RecipeSoftBarBalanced from 'src/pages/RecipeVariants/RecipeSoftBarBalanced'
import RecipeSoftSegment from 'src/pages/RecipeVariants/RecipeSoftSegment'
// Instruction-layout explorations (on the Bar 2 base)
import RecipeInstrTwoColNews from 'src/pages/RecipeVariants/RecipeInstrTwoColNews'
import RecipeInstrTwoColRows from 'src/pages/RecipeVariants/RecipeInstrTwoColRows'
import RecipeInstrSidebarIng from 'src/pages/RecipeVariants/RecipeInstrSidebarIng'
import RecipeInstrSidebarNotes from 'src/pages/RecipeVariants/RecipeInstrSidebarNotes'
import RecipeInstrNarrow from 'src/pages/RecipeVariants/RecipeInstrNarrow'
import RecipeInstrNarrowTight from 'src/pages/RecipeVariants/RecipeInstrNarrowTight'

import AccountPolished from 'src/pages/AccountVariants/AccountPolished'
import AccountCover from 'src/pages/AccountVariants/AccountCover'
import AccountSidebar from 'src/pages/AccountVariants/AccountSidebar'
import AccountCard from 'src/pages/AccountVariants/AccountCard'
import AccountHero from 'src/pages/AccountVariants/AccountHero'
import AccountDashboard from 'src/pages/AccountVariants/AccountDashboard'
import AccountCookbook from 'src/pages/AccountVariants/AccountCookbook'
import AccountTimeline from 'src/pages/AccountVariants/AccountTimeline'
import AccountStats from 'src/pages/AccountVariants/AccountStats'
import AccountCollections from 'src/pages/AccountVariants/AccountCollections'

import { Toaster } from 'react-hot-toast'
import Settings from 'src/pages/Settings/Settings'
import Profile from 'src/pages/Settings/SubSettings/Profile'
import Password from 'src/pages/Settings/SubSettings/Password'
// import RecipeAI from './pages/RecipeAI/RecipeAI'

const ScrollToTop: FC = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('body')?.scrollTo(0, 0)
  }, [pathname])
  return null
}
const App: FC = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Toaster position='bottom-center' toastOptions={{ duration: 5000 }} />
        <ScrollToTop />
        <Routes>
            <Route
              path='*'
              element={
                <Layout darkNavLinks={true}>
                  <NotFound />
                </Layout>
              }
            />
            <Route
              path='/'
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            <Route
              path='/recipes'
              element={
                <Layout darkNavLinks={true}>
                  <Recipes />
                </Layout>
              }
            />

            <Route
              path='/design/discover'
              element={
                <Layout darkNavLinks={true}>
                  <HomeDiscover />
                </Layout>
              }
            />
            <Route
              path='/design/cook'
              element={
                <Layout darkNavLinks={true}>
                  <HomeCook />
                </Layout>
              }
            />
            <Route
              path='/design/plan'
              element={
                <Layout darkNavLinks={true}>
                  <HomePlan />
                </Layout>
              }
            />

            <Route path='/design/home-classic' element={<Layout><HomeClassic /></Layout>} />
            <Route path='/design/home-classic-pulse' element={<Layout><HomeClassicPulse /></Layout>} />
            <Route path='/design/home-classic-curated' element={<Layout><HomeClassicCurated /></Layout>} />
            <Route path='/design/home-classic-mosaic' element={<Layout><HomeClassicMosaic /></Layout>} />
            <Route path='/design/home-classic-shelves' element={<Layout><HomeClassicShelves /></Layout>} />
            <Route path='/design/home-split' element={<Layout darkNavLinks={true}><HomeSplit /></Layout>} />
            <Route path='/design/home-carousel' element={<Layout><HomeCarousel /></Layout>} />
            <Route path='/design/home-stats' element={<Layout><HomeStats /></Layout>} />
            <Route path='/design/home-search' element={<Layout darkNavLinks={true}><HomeSearch /></Layout>} />
            <Route path='/design/home-pantry' element={<Layout darkNavLinks={true}><HomePantry /></Layout>} />
            <Route path='/design/home-feed' element={<Layout><HomeFeed /></Layout>} />
            <Route path='/design/home-atlas' element={<Layout darkNavLinks={true}><HomeAtlas /></Layout>} />
            <Route path='/design/home-chat' element={<Layout darkNavLinks={true}><HomeChat /></Layout>} />
            <Route path='/design/home-forecast' element={<Layout><HomeForecast /></Layout>} />

            {/* Batch 2 — filled-in (same vibe, dark hero → light nav links) */}
            <Route path='/design/v2/warm' element={<Layout><HomeWarm /></Layout>} />
            <Route path='/design/v2/editorial' element={<Layout><HomeEditorial /></Layout>} />
            <Route path='/design/v2/rows' element={<Layout><HomeRows /></Layout>} />
            <Route path='/design/v2/spotlight' element={<Layout><HomeSpotlight /></Layout>} />
            <Route path='/design/v2/browse' element={<Layout><HomeBrowse /></Layout>} />
            <Route path='/design/v2/minimal' element={<Layout><HomeMinimal /></Layout>} />
            <Route path='/design/v2/seasonal' element={<Layout><HomeSeasonal /></Layout>} />
            <Route path='/design/v2/collections' element={<Layout><HomeCollections /></Layout>} />
            <Route path='/design/v2/magazine' element={<Layout><HomeMagazine /></Layout>} />
            <Route path='/design/v2/bistro' element={<Layout><HomeBistro /></Layout>} />

            {/* Batch 2 — feature-forward */}
            <Route path='/design/v2/planner' element={<Layout><HomePlanner /></Layout>} />
            <Route path='/design/v2/budget' element={<Layout><HomeBudget /></Layout>} />
            <Route path='/design/v2/foryou' element={<Layout><HomeForYou /></Layout>} />
            <Route path='/design/v2/timer' element={<Layout><HomeTimer /></Layout>} />
            <Route path='/design/v2/shopping' element={<Layout><HomeShopping /></Layout>} />
            <Route path='/design/v2/community' element={<Layout><HomeCommunity /></Layout>} />
            <Route path='/design/v2/nutrition' element={<Layout><HomeNutrition /></Layout>} />
            <Route path='/design/v2/surprise' element={<Layout><HomeSurprise /></Layout>} />
            <Route path='/design/v2/mood' element={<Layout><HomeMood /></Layout>} />
            <Route path='/design/v2/assistant' element={<Layout><HomeAssistant /></Layout>} />

            <Route path='/design/recipe/polished' element={<Layout darkNavLinks={true}><RecipePolished /></Layout>} />
            {/* Batch A — polished+ */}
            <Route path='/design/recipe/plus' element={<Layout darkNavLinks={true}><RecipePolishedPlus /></Layout>} />
            <Route path='/design/recipe/rail' element={<Layout darkNavLinks={true}><RecipePolishedRail /></Layout>} />
            <Route path='/design/recipe/dashboard' element={<Layout darkNavLinks={true}><RecipeDashboard /></Layout>} />
            <Route path='/design/recipe/feature' element={<Layout><RecipeFeature /></Layout>} />
            <Route path='/design/recipe/studio' element={<Layout darkNavLinks={true}><RecipeStudio /></Layout>} />
            {/* Batch B — polished current page */}
            <Route path='/design/recipe/classic' element={<Layout darkNavLinks={true}><RecipeClassic /></Layout>} />
            <Route path='/design/recipe/classic-warm' element={<Layout darkNavLinks={true}><RecipeClassicWarm /></Layout>} />
            <Route path='/design/recipe/classic-bordered' element={<Layout darkNavLinks={true}><RecipeClassicBordered /></Layout>} />
            <Route path='/design/recipe/classic-centered' element={<Layout darkNavLinks={true}><RecipeClassicCentered /></Layout>} />
            <Route path='/design/recipe/classic-compact' element={<Layout darkNavLinks={true}><RecipeClassicCompact /></Layout>} />
            {/* Bordered family */}
            <Route path='/design/recipe/bordered-refined' element={<Layout darkNavLinks={true}><RecipeBorderedRefined /></Layout>} />
            <Route path='/design/recipe/bordered-accent' element={<Layout darkNavLinks={true}><RecipeBorderedAccent /></Layout>} />
            <Route path='/design/recipe/bordered-teal' element={<Layout darkNavLinks={true}><RecipeBorderedTeal /></Layout>} />
            <Route path='/design/recipe/bordered-split' element={<Layout darkNavLinks={true}><RecipeBorderedSplit /></Layout>} />
            <Route path='/design/recipe/bordered-soft' element={<Layout darkNavLinks={true}><RecipeBorderedSoft /></Layout>} />
            <Route path='/design/recipe/bordered-soft-plus' element={<Layout darkNavLinks={true}><RecipeBorderedSoftPlus /></Layout>} />
            {/* Soft+ header rethinks */}
            <Route path='/design/recipe/soft-strip' element={<Layout darkNavLinks={true}><RecipeSoftStrip /></Layout>} />
            <Route path='/design/recipe/soft-overlay' element={<Layout darkNavLinks={true}><RecipeSoftOverlay /></Layout>} />
            <Route path='/design/recipe/soft-toolbar' element={<Layout darkNavLinks={true}><RecipeSoftToolbar /></Layout>} />
            <Route path='/design/recipe/soft-bar' element={<Layout darkNavLinks={true}><RecipeSoftBar /></Layout>} />
            <Route path='/design/recipe/soft-bar-balanced' element={<Layout darkNavLinks={true}><RecipeSoftBarBalanced /></Layout>} />
            <Route path='/design/recipe/soft-segment' element={<Layout darkNavLinks={true}><RecipeSoftSegment /></Layout>} />
            {/* Instruction-layout explorations */}
            <Route path='/design/recipe/instr-twocol-news' element={<Layout darkNavLinks={true}><RecipeInstrTwoColNews /></Layout>} />
            <Route path='/design/recipe/instr-twocol-rows' element={<Layout darkNavLinks={true}><RecipeInstrTwoColRows /></Layout>} />
            <Route path='/design/recipe/instr-sidebar-ing' element={<Layout darkNavLinks={true}><RecipeInstrSidebarIng /></Layout>} />
            <Route path='/design/recipe/instr-sidebar-notes' element={<Layout darkNavLinks={true}><RecipeInstrSidebarNotes /></Layout>} />
            <Route path='/design/recipe/instr-narrow' element={<Layout darkNavLinks={true}><RecipeInstrNarrow /></Layout>} />
            <Route path='/design/recipe/instr-narrow-tight' element={<Layout darkNavLinks={true}><RecipeInstrNarrowTight /></Layout>} />

            <Route path='/design/account-polished' element={<Layout darkNavLinks={true}><AccountPolished /></Layout>} />
            <Route path='/design/account-cover' element={<Layout><AccountCover /></Layout>} />
            <Route path='/design/account-sidebar' element={<Layout darkNavLinks={true}><AccountSidebar /></Layout>} />
            <Route path='/design/account-card' element={<Layout darkNavLinks={true}><AccountCard /></Layout>} />
            <Route path='/design/account-hero' element={<Layout><AccountHero /></Layout>} />
            <Route path='/design/account-dashboard' element={<Layout darkNavLinks={true}><AccountDashboard /></Layout>} />
            <Route path='/design/account-cookbook' element={<Layout darkNavLinks={true}><AccountCookbook /></Layout>} />
            <Route path='/design/account-timeline' element={<Layout darkNavLinks={true}><AccountTimeline /></Layout>} />
            <Route path='/design/account-stats' element={<Layout darkNavLinks={true}><AccountStats /></Layout>} />
            <Route path='/design/account-collections' element={<Layout darkNavLinks={true}><AccountCollections /></Layout>} />

            <Route
              path='/recipes/:recipeId'
              element={
                <Layout darkNavLinks={true}>
                  <SingleRecipe />
                </Layout>
              }
            />

            <Route path='/' element={<PrivateRoute />}>
              <Route
                path='/account'
                element={
                  <Layout darkNavLinks={true}>
                    <Account />
                  </Layout>
                }
              >
                <Route path='saved-recipes' element={<SavedRecipes />} />
                <Route path='ratings' element={<UserRatings />} />
                <Route path='your-recipes' element={<UserRecipes />} />
              </Route>
              <Route
                path='/settings'
                element={
                  <Layout darkNavLinks={true}>
                    <Settings />
                  </Layout>
                }
              >
                <Route path='' element={<Profile />} />
                <Route path='password' element={<Password />} />
              </Route>
              {/* <Route
                path='recipe-ai'
                element={
                  <Layout>
                    <RecipeAI />
                  </Layout>
                }
              /> */}
              <Route
                path='/add-recipe'
                element={
                  <Layout darkNavLinks={true} navBackgroundColor='gray'>
                    <AddRecipe />
                  </Layout>
                }
              />
              <Route
                path='/help'
                element={
                  <Layout darkNavLinks={true}>
                    <Help />
                  </Layout>
                }
              />
            </Route>
            <Route path='/login' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/create-username' element={<CreateUsername />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
          </Routes>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
