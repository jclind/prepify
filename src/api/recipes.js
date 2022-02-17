import http from './http-common'

class RecipeAPI {
  getAll(page = 0, order = 'new', tags = []) {
    let tagsArrParam = '' // For tags that have been chosen
    if (tags.length > 0) {
      tagsArrParam += '&tags='
      tags.forEach((tag, idx) => {
        tagsArrParam += `${tag},`

        // When the last tag is reached, leave off the last comma for backend array processing
        if (idx === tags.length - 1) {
          tagsArrParam += `${tag}`
        }
      })
    }

    console.log(tagsArrParam)

    return http.get(`recipes?page=${page}&order=${order}${tagsArrParam}`)
  }
  search(query, tag = '', page = 0, order = 'new', recipesPerPage = 5) {
    return http.get(
      `recipes?q=${query.toString()}&page=${page}&tag=${tag}&order=${order}&recipesPerPage=${recipesPerPage}`
    )
  }
  async searchAutoComplete(title = '') {
    return await http.get(`searchAutoCompleteRecipes?title=${title}`)
  }
  async getTrendingRecipes(limit = 4) {
    return await http.get(`getTrendingRecipes?limit=${limit}`)
  }
  async getRecipe(id) {
    return await http.get(`getRecipe?id=${id}`)
  }

  async saveRecipe(userId = '', recipeId = '') {
    return await http.put(`saveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  getSavedRecipe(userId = '', recipeId = '') {
    console.log(userId, recipeId)
    return http.get(`getSavedRecipe?userId=${userId}&recipeId=${recipeId}`)
  }
  unsaveRecipe(userId = '', recipeId = '') {
    return http.put(`unsaveRecipe?userId=${userId}&recipeId=${recipeId}`)
  }

  async addRecipe(data) {
    return await http.post('addRecipe', data)
  }

  async addRecipeTag(data) {
    return await http.post('addRecipeTag', data)
  }

  async searchRecipeTags(q, tagsArr) {
    let tagsArrParam = '' // For tags that have already been chosen
    if (tagsArr.length > 0) {
      tagsArrParam += '&selectedTags='
      tagsArr.forEach(tag => {
        tagsArrParam += `${tag},`
      })
    }

    return await http.get(`searchRecipeTags?q=${q}${tagsArrParam}`)
  }

  async getRecipeTags(limit = 5) {
    return await http.get(`getRecipeTags?limit=${limit}`)
  }

  // Ratings / Reviews
  async newRating(data) {
    return await http.post(`getRecipeTags`, data)
  }

  async newReview(data) {
    return await http.put(`newReview`, data)
  }
  async checkIfReviewed(userId, recipeId) {
    console.log(`checkIfReviewed?userId=${userId}&recipeId=${recipeId}`)
    return await http.get(
      `checkIfReviewed?userId=${userId}&recipeId=${recipeId}`
    )
  }
  async deleteReview(userId, recipeId) {
    return await http.put(`deleteReview?userId=${userId}&recipeId=${recipeId}`)
  }
}

export default new RecipeAPI()
