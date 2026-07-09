import React, { FC, ReactElement, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import AuthProvider from 'src/context/AuthContext'

// Eager routes — the pages visitors land on directly (home, browse, shared
// recipe and profile links, auth entries) plus the catch-all. Everything else
// is a lazy chunk fetched on first navigation (see docs/BACKLOG.md
// route-splitting item: the whole app used to ship as one >1 MB bundle).
import Home from 'src/pages/Home/Home'
import Recipes from 'src/pages/Recipes/Recipes'
import SingleRecipe from 'src/pages/SingleRecipe/SingleRecipe'
import Login from 'src/pages/Login/Login'
import Signup from 'src/pages/Signup/Signup'
import NotFound from 'src/pages/404/404'
import PrivateRoute from 'src/Components/PrivateRoute'
import AdminRoute from 'src/Components/AdminRoute'
import Layout from 'src/Components/Layout/Layout'

import { Toaster } from 'react-hot-toast'
import { Sentry } from 'src/util/sentry'
import AppErrorFallback from 'src/Components/AppErrorFallback/AppErrorFallback'
import RouteFallback from 'src/Components/RouteFallback/RouteFallback'
import { lazyRoute } from 'src/util/lazyRoute'

// Auth side flows.
const ForgotPassword = lazyRoute(
  () => import('src/pages/ForgotPassword/ForgotPassword')
)
const CreateUsername = lazyRoute(
  () => import('src/pages/CreateUsername/CreateUsername')
)

// Admin section (admin-only — pure dead weight for everyone else).
const AdminLayout = lazyRoute(() => import('src/pages/Admin/AdminLayout'))
const Analytics = lazyRoute(
  () => import('src/pages/Admin/Analytics/Analytics')
)
const Reports = lazyRoute(() => import('src/pages/Admin/Reports/Reports'))
const BugReports = lazyRoute(
  () => import('src/pages/Admin/BugReports/BugReports')
)
const Users = lazyRoute(() => import('src/pages/Admin/Users/Users'))
const Ingredients = lazyRoute(
  () => import('src/pages/Admin/Ingredients/Ingredients')
)
const Audit = lazyRoute(() => import('src/pages/Admin/Audit/Audit'))

// Account area. PublicProfile is a direct-landing surface (shared profile
// links), but eager-importing it hoists ~100 kB of shared graph into the
// entry chunk — so it stays lazy; the flash-guarded fallback means a fast
// chunk load never even shows a spinner.
const PublicProfile = lazyRoute(
  () => import('src/pages/PublicProfile/PublicProfile')
)
const Account = lazyRoute(() => import('src/pages/Account/Account'))
const SavedRecipes = lazyRoute(
  () => import('src/pages/Account/SavedRecipes/SavedRecipes')
)
const UserRatings = lazyRoute(
  () => import('src/pages/Account/UserRatings/UserRatings')
)
const UserRecipes = lazyRoute(
  () => import('src/pages/Account/UserRecipes/UserRecipes')
)
const Drafts = lazyRoute(() => import('src/pages/Account/Drafts/Drafts'))

// Recipe editor — the heaviest split (drag-and-drop + react-select live here).
const AddRecipe = lazyRoute(() => import('src/pages/AddRecipe/AddRecipe'))
const EditRecipe = lazyRoute(() => import('src/pages/EditRecipe/EditRecipe'))

// Settings.
const Settings = lazyRoute(() => import('src/pages/Settings/Settings'))
const ProfileSection = lazyRoute(
  () => import('src/pages/Settings/sections/ProfileSection')
)
const AccountSection = lazyRoute(
  () => import('src/pages/Settings/sections/AccountSection')
)
const PrivacySection = lazyRoute(
  () => import('src/pages/Settings/sections/PrivacySection')
)
const DangerSection = lazyRoute(
  () => import('src/pages/Settings/sections/DangerSection')
)

// Company/legal + help (Help also keeps @formspree out of the entry chunk).
const About = lazyRoute(() => import('src/pages/About/About'))
const Privacy = lazyRoute(() => import('src/pages/Privacy/Privacy'))
const Terms = lazyRoute(() => import('src/pages/Terms/Terms'))
const Help = lazyRoute(() => import('src/pages/Help/Help'))

// react-router v7 wraps navigation in React.startTransition, and a transition
// only shows the fallback of a *newly mounted* Suspense boundary — an existing
// one keeps the old page on screen, so navigating between two lazy siblings
// (About → Help, Account tab → tab) would silently freeze until the chunk
// arrives. Keying the boundary by the wrapped page component remounts it per
// page (fallback shows), while shells (Account/Settings/AdminLayout) keep a
// stable key across child-route changes so they don't re-spin on tab switches.
let nextBoundaryKey = 0
const boundaryKeys = new WeakMap<object, number>()
const boundaryKeyFor = (type: unknown): number => {
  let key = boundaryKeys.get(type as object)
  if (key === undefined) {
    key = ++nextBoundaryKey
    boundaryKeys.set(type as object, key)
  }
  return key
}

// Suspense boundary for a lazy page. Sits inside Layout (and inside nested
// outlets like Account/Settings/AdminLayout), so the surrounding shell stays
// mounted while the chunk downloads — only the content area shows the spinner.
const Lazy: FC<{ children: ReactElement }> = ({ children }) => (
  <Suspense key={boundaryKeyFor(children.type)} fallback={<RouteFallback />}>
    {children}
  </Suspense>
)

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
      fallback={({ error, resetError }) => (
        <AppErrorFallback error={error} resetError={resetError} />
      )}
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
                  <Lazy>
                    <PublicProfile />
                  </Lazy>
                </Layout>
              }
            />

            {/* Company/legal pages. */}
            <Route
              path='/about'
              element={
                <Layout darkNavLinks={true}>
                  <Lazy>
                    <About />
                  </Lazy>
                </Layout>
              }
            />
            <Route
              path='/privacy'
              element={
                <Layout darkNavLinks={true}>
                  <Lazy>
                    <Privacy />
                  </Lazy>
                </Layout>
              }
            />
            <Route
              path='/terms'
              element={
                <Layout darkNavLinks={true}>
                  <Lazy>
                    <Terms />
                  </Lazy>
                </Layout>
              }
            />

            <Route path='/' element={<PrivateRoute />}>
              <Route
                path='/account'
                element={
                  <Layout darkNavLinks={true}>
                    <Lazy>
                      <Account />
                    </Lazy>
                  </Layout>
                }
              >
                <Route
                  path='saved-recipes'
                  element={
                    <Lazy>
                      <SavedRecipes />
                    </Lazy>
                  }
                />
                <Route
                  path='ratings'
                  element={
                    <Lazy>
                      <UserRatings />
                    </Lazy>
                  }
                />
                <Route
                  path='your-recipes'
                  element={
                    <Lazy>
                      <UserRecipes />
                    </Lazy>
                  }
                />
                <Route
                  path='drafts'
                  element={
                    <Lazy>
                      <Drafts />
                    </Lazy>
                  }
                />
              </Route>
              <Route
                path='/settings'
                element={
                  <Layout darkNavLinks={true}>
                    <Lazy>
                      <Settings />
                    </Lazy>
                  </Layout>
                }
              >
                {/* Index renders Profile so a direct /settings visit (and the
                    desktop landing) shows it; /settings/profile is the canonical
                    route the nav + mobile master-detail link to. */}
                <Route
                  path=''
                  element={
                    <Lazy>
                      <ProfileSection />
                    </Lazy>
                  }
                />
                <Route
                  path='profile'
                  element={
                    <Lazy>
                      <ProfileSection />
                    </Lazy>
                  }
                />
                <Route
                  path='account'
                  element={
                    <Lazy>
                      <AccountSection />
                    </Lazy>
                  }
                />
                <Route
                  path='privacy'
                  element={
                    <Lazy>
                      <PrivacySection />
                    </Lazy>
                  }
                />
                <Route
                  path='danger'
                  element={
                    <Lazy>
                      <DangerSection />
                    </Lazy>
                  }
                />
                {/* Old bookmark — the password form now lives under Account. */}
                <Route
                  path='password'
                  element={<Navigate to='/settings/account' replace />}
                />
              </Route>
              <Route
                path='/add-recipe'
                element={
                  <Layout darkNavLinks={true}>
                    <Lazy>
                      <AddRecipe />
                    </Lazy>
                  </Layout>
                }
              />
              <Route
                path='/recipes/:recipeId/edit'
                element={
                  <Layout darkNavLinks={true}>
                    <Lazy>
                      <EditRecipe />
                    </Lazy>
                  </Layout>
                }
              />
            </Route>
            <Route
              path='/help'
              element={
                <Layout darkNavLinks={true}>
                  <Lazy>
                    <Help />
                  </Lazy>
                </Layout>
              }
            />
            {/* Admin section — gated by AdminRoute (login + admin claim),
                outside the public Layout (its own AdminLayout shell). */}
            <Route path='/admin' element={<AdminRoute />}>
              <Route
                element={
                  <Lazy>
                    <AdminLayout />
                  </Lazy>
                }
              >
                <Route index element={<Navigate to='/admin/analytics' replace />} />
                <Route
                  path='analytics'
                  element={
                    <Lazy>
                      <Analytics />
                    </Lazy>
                  }
                />
                <Route
                  path='reports'
                  element={
                    <Lazy>
                      <Reports />
                    </Lazy>
                  }
                />
                <Route
                  path='bug-reports'
                  element={
                    <Lazy>
                      <BugReports />
                    </Lazy>
                  }
                />
                <Route
                  path='users'
                  element={
                    <Lazy>
                      <Users />
                    </Lazy>
                  }
                />
                <Route
                  path='ingredients'
                  element={
                    <Lazy>
                      <Ingredients />
                    </Lazy>
                  }
                />
                <Route
                  path='audit'
                  element={
                    <Lazy>
                      <Audit />
                    </Lazy>
                  }
                />
              </Route>
            </Route>

            <Route path='/login' element={<Login />} />
            <Route path='/signup' element={<Signup />} />
            <Route
              path='/create-username'
              element={
                <Lazy>
                  <CreateUsername />
                </Lazy>
              }
            />
            <Route
              path='/forgot-password'
              element={
                <Lazy>
                  <ForgotPassword />
                </Lazy>
              }
            />
          </Routes>
        </AuthProvider>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  )
}

export default App
