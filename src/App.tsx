import React, { FC, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import AuthProvider from 'src/context/AuthContext'

import Home from 'src/pages/Home/Home'
import Recipes from 'src/pages/Recipes/Recipes'
import Login from 'src/pages/Login/Login'
import Signup from 'src/pages/Signup/Signup'
import ForgotPassword from 'src/pages/ForgotPassword/ForgotPassword'
import PrivateRoute from 'src/Components/PrivateRoute'
import AdminRoute from 'src/Components/AdminRoute'
import AdminLayout from 'src/pages/Admin/AdminLayout'
import Analytics from 'src/pages/Admin/Analytics/Analytics'
import Reports from 'src/pages/Admin/Reports/Reports'
import BugReports from 'src/pages/Admin/BugReports/BugReports'
import Users from 'src/pages/Admin/Users/Users'
import Audit from 'src/pages/Admin/Audit/Audit'
import CreateUsername from 'src/pages/CreateUsername/CreateUsername'

import Account from 'src/pages/Account/Account'
import PublicProfile from 'src/pages/PublicProfile/PublicProfile'
import SavedRecipes from 'src/pages/Account/SavedRecipes/SavedRecipes'
import UserRatings from 'src/pages/Account/UserRatings/UserRatings'
import UserRecipes from 'src/pages/Account/UserRecipes/UserRecipes'
import Drafts from 'src/pages/Account/Drafts/Drafts'

import AddRecipe from 'src/pages/AddRecipe/AddRecipe'
import EditRecipe from 'src/pages/EditRecipe/EditRecipe'
import Layout from 'src/Components/Layout/Layout'
import Help from 'src/pages/Help/Help'
import NotFound from 'src/pages/404/404'
import SingleRecipe from 'src/pages/SingleRecipe/SingleRecipe'
import About from 'src/pages/About/About'
import Privacy from 'src/pages/Privacy/Privacy'
import Terms from 'src/pages/Terms/Terms'

import { Toaster } from 'react-hot-toast'
import Settings from 'src/pages/Settings/Settings'
import ProfileSection from 'src/pages/Settings/sections/ProfileSection'
import AccountSection from 'src/pages/Settings/sections/AccountSection'
import PrivacySection from 'src/pages/Settings/sections/PrivacySection'
import DangerSection from 'src/pages/Settings/sections/DangerSection'
import { Sentry } from 'src/util/sentry'
import AppErrorFallback from 'src/Components/AppErrorFallback/AppErrorFallback'
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
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <AppErrorFallback resetError={resetError} />}
    >
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
              path='/recipes/:recipeId'
              element={
                <Layout darkNavLinks={true}>
                  <SingleRecipe />
                </Layout>
              }
            />

            {/* Public, read-only profile. Interim /u/:username prefix — the bare
                top-level /:username (Instagram-style) + a reserved-words blocklist
                are part of the deferred end-of-phases cleanup. */}
            <Route
              path='/u/:username'
              element={
                <Layout darkNavLinks={true}>
                  <PublicProfile />
                </Layout>
              }
            />

            {/* Company/legal pages. */}
            <Route
              path='/about'
              element={
                <Layout darkNavLinks={true}>
                  <About />
                </Layout>
              }
            />
            <Route
              path='/privacy'
              element={
                <Layout darkNavLinks={true}>
                  <Privacy />
                </Layout>
              }
            />
            <Route
              path='/terms'
              element={
                <Layout darkNavLinks={true}>
                  <Terms />
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
                <Route path='drafts' element={<Drafts />} />
              </Route>
              <Route
                path='/settings'
                element={
                  <Layout darkNavLinks={true}>
                    <Settings />
                  </Layout>
                }
              >
                {/* Index renders Profile so a direct /settings visit (and the
                    desktop landing) shows it; /settings/profile is the canonical
                    route the nav + mobile master-detail link to. */}
                <Route path='' element={<ProfileSection />} />
                <Route path='profile' element={<ProfileSection />} />
                <Route path='account' element={<AccountSection />} />
                <Route path='privacy' element={<PrivacySection />} />
                <Route path='danger' element={<DangerSection />} />
                {/* Old bookmark — the password form now lives under Account. */}
                <Route
                  path='password'
                  element={<Navigate to='/settings/account' replace />}
                />
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
                  <Layout darkNavLinks={true}>
                    <AddRecipe />
                  </Layout>
                }
              />
              <Route
                path='/recipes/:recipeId/edit'
                element={
                  <Layout darkNavLinks={true}>
                    <EditRecipe />
                  </Layout>
                }
              />
            </Route>
            <Route
              path='/help'
              element={
                <Layout darkNavLinks={true}>
                  <Help />
                </Layout>
              }
            />
            {/* Admin section — gated by AdminRoute (login + admin claim),
                outside the public Layout (its own AdminLayout shell). */}
            <Route path='/admin' element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to='/admin/analytics' replace />} />
                <Route path='analytics' element={<Analytics />} />
                <Route path='reports' element={<Reports />} />
                <Route path='bug-reports' element={<BugReports />} />
                <Route path='users' element={<Users />} />
                <Route path='audit' element={<Audit />} />
              </Route>
            </Route>

            <Route path='/login' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/create-username' element={<CreateUsername />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
          </Routes>
        </AuthProvider>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  )
}

export default App
