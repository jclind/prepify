import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import AuthProvider from './context/AuthContext'

import Home from './pages/Home/Home'
import Recipes from './pages/Recipes/Recipes'
import Login from './pages/Login/Login'
import Signup from './pages/Signup/Signup'
import ForgotPassword from './pages/ForgotPassword/ForgotPassword'
import PrivateRoute from './Components/PrivateRoute'
import CreateUsername from './pages/CreateUsername/CreateUsername'

import Account from './pages/Account/Account'
import SavedRecipes from './pages/Account/SavedRecipes/SavedRecipes'
import UserRatings from './pages/Account/UserRatings/UserRatings'
import UserRecipes from './pages/Account/UserRecipes/UserRecipes'

import AddRecipe from './pages/AddRecipe/AddRecipe'
import Layout from './Components/Layout/Layout'
import Help from './pages/Help/Help'
import NotFound from './pages/404/404'
import SingleRecipe from './pages/SingleRecipe/SingleRecipe'

import { Toaster } from 'react-hot-toast'
import Settings from './pages/Settings/Settings'
import Profile from './pages/Settings/SubSettings/Profile'
import Password from './pages/Settings/SubSettings/Password'
// import RecipeAI from './pages/RecipeAI/RecipeAI'

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('body')?.scrollTo(0, 0)
  }, [pathname])
  return null
}
function App() {
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
