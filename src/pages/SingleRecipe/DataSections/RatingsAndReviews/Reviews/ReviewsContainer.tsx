import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { ReviewType } from 'types'
import ReviewsList from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsList'
import AddReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/AddReview'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'

const recipesPerPage = 5

type ReviewsContainerProps = {
  currUserReview: ReviewType | null
  setCurrUserReview: (val: ReviewType | null) => void
  rating: number
  recipeId: string
  isOwner?: boolean
}

const ReviewsContainer: FC<ReviewsContainerProps> = ({
  currUserReview,
  setCurrUserReview,
  rating,
  recipeId,
  isOwner = false,
}) => {
  const [reviewList, setReviewList] = useState<ReviewType[]>([])
  const [reviewListPage, setReviewListPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)
  // Reviews are always shown newest-first. The sort dropdown that once drove
  // this was hidden (display:none) and existed only to set 'new' on mount, so
  // it's replaced by this constant — the query now fetches directly on mount.
  const reviewListSort = 'new'

  const uid = AuthAPI.getUID()

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', recipeId, reviewListSort, reviewListPage],
    queryFn: () =>
      RecipeAPI.getReviews(recipeId, reviewListSort, reviewListPage, recipesPerPage),
  })

  useEffect(() => {
    if (data) {
      const updatedArr =
        reviewListPage === 0
          ? [...data.reviews]
          : [...reviewList, ...data.reviews]
      // Remove elements that are only ratings and not reviews
      const reviewArr = updatedArr.filter((r: ReviewType) => r.reviewText)
      setReviewList(reviewArr)
      setIsMoreReviews(Number(data.totalCount) > updatedArr.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const handleLoadMoreReviews = () => {
    setReviewListPage(prev => prev + 1)
  }

  return (
    <div className='reviews'>
      {!isOwner && (
        <div className='leave-review-input-container'>
          {!currUserReview ? (
            <AddReview
              rating={rating}
              recipeId={recipeId}
              uid={uid}
              setCurrUserReview={setCurrUserReview}
            />
          ) : (
            <div className='curr-user-review'>
              <h4 className='heading'>Your review</h4>
              <RecipeReview
                review={currUserReview}
                setCurrUserReview={setCurrUserReview}
                recipeId={recipeId}
              />
            </div>
          )}
        </div>
      )}
      <ReviewsList
        recipeId={recipeId}
        currUserReview={currUserReview}
        getNextReviewsPage={handleLoadMoreReviews}
        isMoreReviews={isMoreReviews}
        reviewList={reviewList}
        loading={isLoading}
      />
    </div>
  )
}

export default ReviewsContainer
