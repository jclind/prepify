import React, { useState, useEffect, useRef } from 'react'
import './RecipeRatings.scss'
import { Link } from 'react-router-dom'
import StarRatings from 'react-star-ratings'
import { BsStar } from 'react-icons/bs'
import RecipeReview from './RecipeReview/RecipeReview'
import { formatRating } from '../../../util/formatRating'
import ReviewFilters from './ReviewFilters'
import { useAlert } from 'react-alert'
import RecipeAPI from 'src/api/recipes'
import { ReviewType } from 'types'
import { useAuth } from 'src/context/AuthContext'

type RecipeRatingsProps = {
  recipeId: string
  ratingVal: number
  ratingCount: number
  currUserReview: any
  setCurrUserReview: any
}

const RecipeRatings = ({
  recipeId,
  ratingVal,
  ratingCount,
  currUserReview,
  setCurrUserReview,
}: RecipeRatingsProps) => {
  const [rating, setRating] = useState(0)
  const [isReviewed, setIsReviewed] = useState(false)

  const [reviewList, setReviewList] = useState<ReviewType[]>([])
  const [reviewListPage, setReviewListPage] = useState(0)
  const [isMoreReviews, setIsMoreReviews] = useState(false)
  const [reviewListSort, setReviewListSort] = useState<string>('')

  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [newReviewText, setNewReviewText] = useState('')
  const [newReviewError, setNewReviewError] = useState('')

  const addReviewTextAreaRef = useRef<HTMLTextAreaElement>(null)

  const authRes = useAuth()
  const uid = authRes?.user?.uid
  const alert = useAlert()

  const recipesPerPage = 5

  const getNextReviewsPage = (recipeId: string) => {
    RecipeAPI.getReviews(
      recipeId,
      'new',
      reviewListPage + 1,
      recipesPerPage
    ).then(res => {
      const updatedArr: ReviewType[] = [...reviewList, ...res?.data.reviews]
      setReviewList(updatedArr)
      if (res?.data.totalCount > updatedArr.length) {
        setIsMoreReviews(true)
      } else {
        setIsMoreReviews(false)
      }
    })
    setReviewListPage(reviewListPage + 1)
  }

  useEffect(() => {
    if (uid) {
      RecipeAPI.checkIfReviewed(recipeId).then(res => {
        const reviewData = res || null

        const userRating = reviewData?.rating
        const isUserReview = reviewData?.reviewText?.length > 0

        if (!isNaN(userRating)) {
          setRating(Number(userRating))
        }
        setCurrUserReview(reviewData ?? {})
        setIsReviewed(isUserReview)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])
  useEffect(() => {
    if (reviewListSort && uid) {
      setReviewListPage(0)
      RecipeAPI.getReviews(recipeId, reviewListSort, 0, recipesPerPage).then(
        res => {
          if (res) {
            const updatedArr = res.reviews || []
            setReviewList(updatedArr)

            if (res.totalCount > updatedArr.length) {
              setIsMoreReviews(true)
            } else {
              setIsMoreReviews(false)
            }
          }
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewListSort, uid])

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
    RecipeAPI.newReview(recipeId, newReviewText).then(res => {
      setCurrUserReview(res)
      setIsReviewed(true)
    })
  }
  const changeRating = (e: any) => {
    RecipeAPI.addRating(recipeId, e)
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
              {uid ? (
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
                <div className={`review-open ${isReviewOpen ? 'visible' : ''}`}>
                  <h4 className='review-input-title'>Write Review:</h4>
                  {newReviewError && (
                    <div className='error'>{newReviewError}</div>
                  )}
                  <textarea
                    name='review'
                    className='review-text-area'
                    value={newReviewText}
                    onChange={e => setNewReviewText(e.target.value)}
                    ref={addReviewTextAreaRef}
                  />
                  <div className='btns-container'>
                    <button
                      className='close-review-textarea-btn'
                      onClick={() => setIsReviewOpen(false)}
                    >
                      close
                    </button>
                    <button
                      className='submit-review-btn btn'
                      onClick={handleSubmitReview}
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
                <button
                  className={`leave-review-btn btn ${
                    isReviewOpen ? '' : 'visible'
                  }`}
                  onClick={() => {
                    if (uid) {
                      setNewReviewText('')
                      setIsReviewOpen(true)
                      addReviewTextAreaRef?.current &&
                        addReviewTextAreaRef.current.focus()
                    } else {
                      alert.show(
                        <div>
                          Please <Link to='/login'>login</Link> to add a review.
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
                return <RecipeReview key={uid} review={review} />
              })
            ) : !isReviewed ? (
              <div className='no-reviews'>No Reviews</div>
            ) : null}
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
