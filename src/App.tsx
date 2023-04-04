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

import { transitions, positions, Provider as AlertProvider } from 'react-alert'
import {
  AiOutlineInfoCircle,
  AiOutlineCheckCircle,
  AiOutlineClose,
} from 'react-icons/ai'
import { BiError } from 'react-icons/bi'

const alertOptions = {
  // you can also just use 'bottom center'
  position: positions.BOTTOM_CENTER,
  timeout: 5000,
  offset: '30px',
  // you can also just use 'scale'
  transition: transitions.SCALE,
}
const AlertTemplate = ({ style, options, message, close }: any) => {
  return (
    <div style={style} className='alert'>
      {options.type === 'info' && <AiOutlineInfoCircle className='icon info' />}
      {options.type === 'success' && (
        <AiOutlineCheckCircle className='icon success' />
      )}
      {options.type === 'error' && <BiError className='icon error' />}
      <div className='content'>{message}</div>
      <AiOutlineClose className='close-icon' onClick={close} />
    </div>
  )
}

const ScrollToTop = () => {
  const { pathname } = useLocation()
  useEffect(() => {
    console.log('testing')
    document.querySelector('body')?.scrollTo(0, 0)
    console.log(document.querySelector('body'))
  }, [pathname])
  return null
}
function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <AlertProvider template={AlertTemplate} {...alertOptions}>
          {/* <div className='app-container'> */}
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
          {/* </div> */}
        </AlertProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}

export default App
