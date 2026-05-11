import React, { useEffect } from 'react'
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

import { Toaster } from 'react-hot-toast'
import Settings from 'src/pages/Settings/Settings'
import Profile from 'src/pages/Settings/SubSettings/Profile'
import Password from 'src/pages/Settings/SubSettings/Password'
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
