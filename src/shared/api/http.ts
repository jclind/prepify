import axios from 'axios'

export const http = axios.create({
  baseURL:
    'https://us-east-1.aws.data.mongodb-api.com/app/prepify-ixumn/endpoint',
  headers: {
    'Content-type': 'application/json',
  },
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
