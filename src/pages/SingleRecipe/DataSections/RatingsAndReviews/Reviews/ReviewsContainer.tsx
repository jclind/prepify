import React, { FC, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import { ReviewType } from 'types'
import ReviewFilters from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewFilters'
import ReviewsList from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/ReviewsList'
import AddReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/AddReview'
import RecipeReview from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/Reviews/RecipeReview'

const recipesPerPage = 5

type ReviewsContainerProps = {
  currUserReview: ReviewType | null
  setCurrUserReview: (val: ReviewType | null) => void
  rating: number
  recipeId: string
}

const ReviewsContainer: FC<ReviewsContainerProps> = ({
  currUserReview,
  setCurrUserReview,
  rating,
  recipeId,
}) => {
  const [reviewList, setReviewList] = useState<ReviewType[]>([])
  const [reviewListPage, setReviewListPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)
  const [reviewListSort, setReviewListSort] = useState<string>('')

  const uid = AuthAPI.getUID()

  const { data } = useQuery({
    queryKey: ['reviews', recipeId, reviewListSort, reviewListPage],
    queryFn: () =>
      RecipeAPI.getReviews(recipeId, reviewListSort, reviewListPage, recipesPerPage),
    enabled: reviewListPage >= 0 && !!reviewListSort,
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

  const handleSortChange = (sort: string) => {
    setReviewListPage(0)
    setReviewListSort(sort)
  }

  const handleLoadMoreReviews = () => {
    setReviewListPage(prev => prev + 1)
  }

  return (
    <div className='reviews'>
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
            <h4 className='heading'>Your Review:</h4>
            <RecipeReview
              review={currUserReview}
              setCurrUserReview={setCurrUserReview}
              recipeId={recipeId}
            />
          </div>
        )}
      </div>
      <div className='review-filters'>
        <ReviewFilters
          reviewListSort={reviewListSort}
          setReviewListSort={handleSortChange}
          isList={reviewList.length > 0}
        />
      </div>
      <ReviewsList
        recipeId={recipeId}
        currUserReview={currUserReview}
        getNextReviewsPage={handleLoadMoreReviews}
        isMoreReviews={isMoreReviews}
        reviewList={reviewList}
      />
    </div>
  )
}

export default ReviewsContainer
