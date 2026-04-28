const request = require('supertest')
const app = require('../app')

describe('GET /recipes', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/recipes')
    expect(res.status).toBe(200)
  })
})
