import axios from 'axios'
import { getAuth } from 'firebase/auth'

export const http = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000',
  headers: {
    'Content-type': 'application/json',
  },
})

http.interceptors.request.use(async (config) => {
  const auth = getAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

export const nutrition = axios.create({
  baseURL: 'https://api.edamam.com/api',
  headers: {
    'Content-type': 'application/json',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Origin': 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  },
})
