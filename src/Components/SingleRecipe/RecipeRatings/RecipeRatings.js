import React, { useState, useEffect } from 'react'
import './RecipeRatings.scss'
import { Link } from 'react-router-dom'
import StarRatings from 'react-star-ratings'
import { BsStar } from 'react-icons/bs'
import { useRecipe } from '../../../context/RecipeContext'
import RecipeReview from './RecipeReview/RecipeReview'
import { formatRating } from '../../../util/formatRating'
import ReviewFilters from './ReviewFilters'
import { useAuth } from '../../../context/AuthContext'
import { useAlert } from 'react-alert'

const RecipeRatings = ({
  recipeId,
  ratingVal,
  ratingCount,
  currUserReview,
  setCurrUserReview,
}) => {
  const [rating, setRating] = useState(0)
  const [isReviewed, setIsReviewed] = useState(false)

  const [reviewList, setReviewList] = useState([])
  const [reviewListPage, setReviewListPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)
  const [reviewListSort, setReviewListSort] = useState('')

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [newReviewText, setNewReviewText] = useState('')
  const [newReviewError, setNewReviewError] = useState('')

  const { checkIfReviewed, newReview, getReviews, addRating } = useRecipe()
  const { user } = useAuth()
  const alert = useAlert()

  const recipesPerPage = 5

  const getNextReviewsPage = recipeId => {
    getReviews(recipeId, reviewListPage + 1, recipesPerPage).then(res => {
      const updatedArr = [...reviewList, ...res.data.reviews]
      setReviewList([...updatedArr])
      if (res.data.totalCount > updatedArr.length) {
        setIsMoreReviews(true)
      } else {
        setIsMoreReviews(false)
      }
    })
    setReviewListPage(reviewListPage + 1)
  }

  useEffect(() => {
    if (user) {
      checkIfReviewed(recipeId).then(res => {
        const resData = res.data
        const reviewData = resData || null

        const userRating = reviewData?.rating
        const isUserReview = reviewData?.reviewText?.length > 0

        if (!isNaN(userRating)) {
          setRating(Number(userRating))
        }
        setCurrUserReview(reviewData)
        setIsReviewed(isUserReview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (reviewListSort) {
      setReviewListPage(0)
      getReviews(recipeId, reviewListSort, 0, recipesPerPage).then(res => {
        if (res && res.data) {
          const updatedArr = [...res.data.reviews]
          setReviewList([...updatedArr])
          if (res.data.totalCount > updatedArr.length) {
            setIsMoreReviews(true)
          } else {
            setIsMoreReviews(false)
          }
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewListSort])

  useEffect(() => {
    if (currUserReview.length <= 0) {
      return setIsReviewed(false)
    }
  }, [currUserReview])

  const handleSubmitReview = () => {
    setNewReviewError('')
    if (rating === 0) {
      return setNewReviewError(
        'Please add a rating before submitting your review.'
      )
    }
    if (newReviewText.length < 5) {
      return setNewReviewError(
        'Review is too short. Please make sure to add 4 or more characters.'
      )
    }
    setIsReviewOpen(false)
    newReview(recipeId, newReviewText).then(res => {
      setCurrUserReview(res.data)
      setIsReviewed(true)
    })
  }
  const changeRating = e => {
    addRating(recipeId, e)
    setRating(e)
  }

  return (
    <div className='recipe-ratings' id='recipeReviews'>
      <h2 className='title'>Ratings & Reviews</h2>
      <div className='ratings-reviews-container'>
        <div className='overview'>
          <div className='average-rating-container'>
            <span className='text'>Average Rating:</span>
            <div className='average-rating'>
              <BsStar className='icon' />
              <div className='number'>
                {Number(ratingVal) === 0
                  ? '0'
                  : formatRating(ratingVal, ratingCount)}
              </div>
              <span className='count'>({ratingCount})</span>
            </div>
          </div>
          <div className='user-rating'>
            <span className='text'>Your Rating:</span>
            <div className='user-rate-container'>
              {user ? (
                <StarRatings
                  rating={rating}
                  starRatedColor='#ff5722'
                  changeRating={changeRating}
                  numberOfStars={5}
                  starDimension='30px'
                  starSpacing='2px'
                  name='rating'
                />
              ) : (
                <Link to='/login' className='text'>
                  Sign In To Rate
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className='reviews'>
          <div className='leave-review-input-container'>
            {!isReviewed ? (
              <>
                {isReviewOpen ? (
                  <div className='review-open'>
                    <h4 className='review-input-title'>Write Review:</h4>
                    {newReviewError && (
                      <div className='error'>{newReviewError}</div>
                    )}
                    <textarea
                      name='review'
                      className='review-text-area'
                      value={newReviewText}
                      onChange={e => setNewReviewText(e.target.value)}
                    />
                    <button
                      className='submit-review-btn btn'
                      onClick={handleSubmitReview}
                    >
                      Submit Review
                    </button>
                  </div>
                ) : (
                  <button
                    className='leave-review-btn btn'
                    onClick={() => {
                      if (user) {
                        setNewReviewText('')
                        setIsReviewOpen(true)
                      } else {
                        alert.show(
                          <div>
                            Please <Link to='/login'>login</Link> to add a
                            review.
                          </div>,
                          {
                            timeout: 10000,
                            type: 'info',
                          }
                        )
                      }
                    }}
                  >
                    Add Review
                  </button>
                )}
              </>
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
              setReviewListSort={setReviewListSort}
              isList={reviewList.length > 0}
            />
          </div>
          <div className='reviews-container'>
            {reviewList.length > 0 ? (
              reviewList.map(review => {
                return <RecipeReview key={review.userId} review={review} />
              })
            ) : (
              <div className='no-reviews'>No Reviews</div>
            )}
            {isMoreReviews && (
              <div className='get-more-reviews'>
                <button
                  className='get-more-reviews-btn btn'
                  onClick={() => getNextReviewsPage(recipeId)}
                >
                  More Reviews
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeRatings
