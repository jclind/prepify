import React, { FC, useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Helmet } from 'react-helmet-async'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { AiOutlineClockCircle, AiOutlineUsergroupAdd } from 'react-icons/ai'
import { BsStar, BsStarFill } from 'react-icons/bs'
import { BiLeftArrowAlt, BiCheckCircle } from 'react-icons/bi'
import { CiShoppingBasket } from 'react-icons/ci'
import { TbTag } from 'react-icons/tb'

import './SingleRecipe.scss'

import NutritionData from 'src/pages/SingleRecipe/DataSections/NutritionData/NutritionData'
import RecipeControls from 'src/pages/SingleRecipe/DataSections/RecipeControls/RecipeControls'
import MadeRecipeBtn from 'src/pages/SingleRecipe/Buttons/MadeRecipeBtn'
import SaveControl from 'src/Components/AddToCollection/SaveControl'
import AddRatingBtn from 'src/pages/SingleRecipe/Buttons/AddRatingBtn'
import PrintRecipeBtn from 'src/pages/SingleRecipe/Buttons/PrintRecipeBtn'
import RatingsAndReviews from 'src/pages/SingleRecipe/DataSections/RatingsAndReviews/RatingsAndReviews'
import RecipeNotFound from 'src/pages/SingleRecipe/RecipeNotFound/RecipeNotFound'
import PrintableRecipe from 'src/pages/SingleRecipe/PrintableRecipe/PrintableRecipe'
import ReportControl from 'src/Components/ReportControl/ReportControl'
import AdminRecipeControls from 'src/Components/AdminRecipeControls/AdminRecipeControls'
import { SITE_URL, DEFAULT_OG_IMAGE } from 'src/util/seo'

import { updateIngredients } from 'src/util/updateIngredients'
import { capitalize } from 'src/util/capitalize'
import { formatRating } from 'src/util/formatRating'
import { formatMonthYear } from 'src/util/formatDate'
import { formatPrice } from 'src/util/formatPrice'
import { closestFraction } from 'src/util/validateIngredientQuantityStr'

import { IngredientsType, InstructionsType, RecipeType, ReviewType } from 'types'
import RecipeAPI from 'src/api/recipes'
import AuthAPI from 'src/api/auth'
import { buildRecipeJsonLd } from 'src/pages/SingleRecipe/buildRecipeJsonLd'

type LocalStorageRecipeType = { recipeId: string; numServings: number }

const skeletonColor = '#d6d6d6'

const SingleRecipe: FC = () => {
  const { recipeId } = useParams<{ recipeId: string }>()

  const { data: fetchedRecipe, isPending, isError } = useQuery({
    queryKey: ['recipe', recipeId],
    // Map a 404 to null instead of throwing: a missing recipe is a definitive
    // "not found", not a transient failure, so it should render RecipeNotFound
    // immediately rather than burning the query's retry budget (~7s) and then
    // showing a generic error. Other failures still throw → normal retry path.
    queryFn: async () => {
      try {
        return await RecipeAPI.getRecipe(recipeId!)
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) return null
        throw err
      }
    },
    enabled: !!recipeId,
  })

  const loading = isPending
  const recipe404 =
    !isPending && !isError && (!fetchedRecipe || !fetchedRecipe.title)
  const recipeError = isError ? 'Failed to load recipe. Please try again.' : null
  const currRecipe: RecipeType | null =
    !isPending && fetchedRecipe && fetchedRecipe.title ? fetchedRecipe : null

  const [modIngredients, setModIngredients] = useState<IngredientsType[]>([])
  const [currUserReview, setCurrUserReview] = useState<ReviewType | null>(null)
  const [servingSize, setServingSize] = useState(0)
  // Draft string for the servings input so the field can be cleared or hold an
  // in-progress value while typing; the committed numeric value is servingSize.
  const [servDraft, setServDraft] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const printedRef = useRef<HTMLDivElement>(null)

  const updateRecipeLocalStorage = (recipeId: string, numServings: number) => {
    const arr: LocalStorageRecipeType[] = JSON.parse(
      localStorage.getItem('recipeServings') || '[]'
    )
    const idx = arr.findIndex(item => item.recipeId === recipeId)
    if (idx !== -1) arr[idx].numServings = numServings
    else arr.push({ recipeId, numServings })
    localStorage.setItem('recipeServings', JSON.stringify(arr))
  }

  useEffect(() => {
    if (currRecipe && servingSize > 0) {
      updateRecipeLocalStorage(currRecipe._id, servingSize)
      setModIngredients(
        updateIngredients(currRecipe.ingredients, currRecipe.servings, servingSize)
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servingSize])

  useEffect(() => {
    if (fetchedRecipe && fetchedRecipe.title) {
      const ls: LocalStorageRecipeType[] = JSON.parse(
        localStorage.getItem('recipeServings') || '[]'
      )
      const obj = ls.find(item => item.recipeId === fetchedRecipe._id)
      setServingSize(obj ? obj.numServings : fetchedRecipe.servings)
    }
  }, [fetchedRecipe])

  // Keep the input's draft in sync when servingSize changes elsewhere (initial
  // load, the +/− steppers) without clobbering what the user is typing.
  useEffect(() => {
    setServDraft(servingSize ? String(servingSize) : '')
  }, [servingSize])

  const toggleChecked = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const changeServings = (n: number) => {
    if (n >= 1 && n < 100) setServingSize(n)
  }

  const eyebrow = currRecipe
    ? [currRecipe.cuisine, currRecipe.mealTypes?.[0]].filter(Boolean).join(' · ')
    : ''
  const ratingCount = currRecipe?.rating?.rateCount ?? 0
  const servPrice = currRecipe?.servingPrice ?? 0
  const hasPrice = servPrice > 0
  const currUID = AuthAPI.getUID()
  const isOwner = !!currUID && !!currRecipe?.userId && currUID === currRecipe.userId
  const ingredients =
    modIngredients.length > 0 ? modIngredients : currRecipe?.ingredients ?? []
  const instructions = currRecipe?.instructions ?? []

  const pageUrl =
    typeof window !== 'undefined' ? window.location.href : ''
  const recipeJsonLd = currRecipe ? buildRecipeJsonLd(currRecipe, pageUrl) : null

  // Social/meta values for this recipe. Canonical is built from the production
  // origin (not window.location, which is localhost in dev) so crawlers resolve it.
  const recipeName = currRecipe?.title ? capitalize(currRecipe.title) : ''
  const recipeTitleTag = loading
    ? 'Loading recipe… · Prepify'
    : recipeName
    ? `${recipeName} · Prepify`
    : 'Recipe not found · Prepify'
  const recipeCanonical = currRecipe
    ? `${SITE_URL}/recipes/${currRecipe._id}`
    : ''
  const recipeOgImage = currRecipe?.recipeImage || DEFAULT_OG_IMAGE

  const renderIngredient = (ingr: IngredientsType) => {
    if ('parsedIngredient' in ingr) {
      const { quantity, unit, ingredient, comment } = ingr.parsedIngredient
      const isChecked = checked.has(ingr.id)
      const image = ingr.ingredientData?.imagePath
      return (
        <li
          key={ingr.id}
          className={`ing ${isChecked ? 'checked' : ''}`}
          role='checkbox'
          aria-checked={isChecked}
          tabIndex={0}
          onClick={() => toggleChecked(ingr.id)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggleChecked(ingr.id)
            }
          }}
        >
          <span className='box'>{isChecked ? <BiCheckCircle /> : null}</span>
          <span className='thumb'>
            {image ? (
              <img src={image} alt={ingredient ?? ''} loading='lazy' />
            ) : (
              <CiShoppingBasket className='no-img' />
            )}
          </span>
          <span className='ing-text'>
            <span className='qty'>
              {quantity ? closestFraction(quantity) : ''}
              {unit ? ` ${unit}` : ''}
            </span>{' '}
            <span className='name'>
              {ingredient}
              {comment ? `, ${comment}` : ''}
            </span>
          </span>
        </li>
      )
    }
    return (
      <li key={ingr.id} className='ing-group-label'>
        {ingr.label.replace(/:/g, '')}
      </li>
    )
  }

  const renderInstruction = (instr: InstructionsType) => {
    if ('content' in instr) {
      return (
        <li key={instr.id} className='step'>
          <span className='num'>{instr.index}</span>
          <p>{instr.content}</p>
        </li>
      )
    }
    return (
      <li key={instr.id} className='step-group-label'>
        {instr.label.replace(/:/g, '')}
      </li>
    )
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>{recipeTitleTag}</title>
        {currRecipe?.description && (
          <meta name='description' content={currRecipe.description} />
        )}
        {/*
          Per-recipe Open Graph / Twitter. This is the sole live-head meta source
          for the route once the static index.html fallbacks (data-rh-default)
          are stripped on JS boot — React 19 hoists these natively and does not
          merge across <Helmet> instances, so there's exactly one of each tag.

          Each tag is its own conditional (rather than one fragment) on purpose:
          react-helmet-async expects direct, valid head-element children, so a
          wrapping <>…</> fragment here is not reliably handled.
        */}
        {currRecipe && <meta property='og:type' content='article' />}
        {currRecipe && <link rel='canonical' href={recipeCanonical} />}
        {currRecipe && <meta property='og:url' content={recipeCanonical} />}
        {currRecipe && (
          <meta name='twitter:card' content='summary_large_image' />
        )}
        {recipeName && (
          <meta property='og:title' content={`${recipeName} · Prepify`} />
        )}
        {recipeName && (
          <meta name='twitter:title' content={`${recipeName} · Prepify`} />
        )}
        {currRecipe?.description && (
          <meta property='og:description' content={currRecipe.description} />
        )}
        {currRecipe?.description && (
          <meta name='twitter:description' content={currRecipe.description} />
        )}
        {currRecipe && (
          <meta property='og:image' content={recipeOgImage} />
        )}
        {currRecipe && (
          <meta name='twitter:image' content={recipeOgImage} />
        )}
        {recipeJsonLd && (
          <script type='application/ld+json'>
            {JSON.stringify(recipeJsonLd)}
          </script>
        )}
      </Helmet>

      {recipeError ? (
        <div className='recipe-fetch-error'>{recipeError}</div>
      ) : recipe404 ? (
        <RecipeNotFound />
      ) : (
        <div className='page single-recipe-page'>
          <div className='sr-controls'>
            <Link to='/recipes' className='sr-back'>
              <BiLeftArrowAlt /> All recipes
            </Link>
            {/* Quick-access report kebab (the quiet footer link below stays too).
                Hidden for the owner; logged-out clicks nudge to log in. */}
            {currRecipe && !isOwner && (
              <ReportControl
                variant='menu'
                target={{ targetType: 'recipe', recipeId: currRecipe._id }}
              />
            )}
          </div>

          {currRecipe && (
            <RecipeControls
              recipeId={currRecipe._id}
              recipeUserId={currRecipe.userId}
              recipeTitle={currRecipe.title}
              views={currRecipe.views}
              numTimesSaved={currRecipe.numTimesSaved}
              numTimesMade={currRecipe.numTimesMade}
            />
          )}

          <header className='hero'>
            <div className='hero-img'>
              {loading || !currRecipe?.recipeImage ? (
                <Skeleton baseColor={skeletonColor} className='img-skeleton' />
              ) : (
                <img
                  src={currRecipe.recipeImage}
                  alt={currRecipe.title}
                  title={currRecipe.title}
                  loading='eager'
                />
              )}
            </div>
            <div className='hero-text'>
              {eyebrow && <div className='eyebrow'>{eyebrow}</div>}
              <h1>
                {loading ? (
                  <span data-testid='header-loading'>
                    <Skeleton baseColor={skeletonColor} width={320} />
                  </span>
                ) : (
                  capitalize(currRecipe?.title || '')
                )}
              </h1>
              {/* Top-of-page rating echo. 2c moved the action-bar rating tile
                  out for the per-serving price; this re-surfaces it compactly by
                  the title (the full breakdown still lives in Ratings & Reviews).
                  Only shown once rated, so an unrated recipe isn't labelled. */}
              {currRecipe && ratingCount > 0 && (
                <div className='hero-rating' aria-label={`Rated ${formatRating(currRecipe.rating?.rateValue, ratingCount)} out of 5 from ${ratingCount} ratings`}>
                  <BsStarFill className='hr-star' aria-hidden='true' />
                  <span className='hr-val'>
                    {formatRating(currRecipe.rating?.rateValue, ratingCount)}
                  </span>
                  <span className='hr-count'>
                    · {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>
              )}
              {loading ? (
                <Skeleton baseColor={skeletonColor} count={2} />
              ) : (
                <p className='description'>{currRecipe?.description}</p>
              )}
              {currRecipe && (
                <div className='author-row'>
                  <span className='avatar' aria-hidden='true'>
                    {(currRecipe.authorUsername || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className='author-text'>
                    by <strong>@{currRecipe.authorUsername}</strong>
                    {currRecipe.createdAt && formatMonthYear(currRecipe.createdAt) && (
                      <> · {formatMonthYear(currRecipe.createdAt)}</>
                    )}
                  </span>
                </div>
              )}
            </div>
          </header>

          <div className='action-bar'>
            <div className='meta'>
              <div className='m-item'>
                <span className='m-top'>
                  <AiOutlineClockCircle className='m-ic' />
                  <span className='m-v'>{currRecipe?.totalTime ?? '—'} min</span>
                </span>
                <span className='m-l'>Total time</span>
              </div>
              <div className='m-item'>
                <span className='m-top'>
                  <AiOutlineUsergroupAdd className='m-ic' />
                  <span className='m-v'>{servingSize || currRecipe?.servings || '—'}</span>
                </span>
                <span className='m-l'>Servings</span>
              </div>
              {hasPrice ? (
                <div className='m-item m-cost'>
                  <span className='m-top'>
                    <TbTag className='m-ic' />
                    <span className='m-v'>{formatPrice(servPrice)}</span>
                  </span>
                  <span className='m-l'>Per serving</span>
                </div>
              ) : (
                <div className='m-item'>
                  <span className='m-top'>
                    <BsStar className='m-ic' />
                    <span className='m-v'>
                      {currRecipe && ratingCount > 0
                        ? formatRating(currRecipe.rating?.rateValue, ratingCount)
                        : '—'}
                    </span>
                  </span>
                  <span className='m-l'>{ratingCount > 0 ? `(${ratingCount})` : 'No ratings'}</span>
                </div>
              )}
            </div>
            <div className='sr-actions'>
              {currRecipe && (
                <>
                  <SaveControl
                    recipeId={currRecipe._id}
                    variant='button'
                    className='save-recipe'
                    triggerClassName='save-recipe-btn btn'
                    align='left'
                  />
                  <AddRatingBtn currUserReview={currUserReview} />
                  <PrintRecipeBtn printedRef={printedRef} />
                </>
              )}
            </div>
          </div>

          {currRecipe && <AdminRecipeControls recipe={currRecipe} />}

          <div className='body'>
            <section className='card ingredients-card'>
              <div className='sec-head'>
                <h2>Ingredients</h2>
                {!loading && (
                  <div className='servings-pill'>
                    <button
                      type='button'
                      className='step-btn'
                      onClick={() => changeServings((servingSize || 1) - 1)}
                    >
                      −
                    </button>
                    <input
                      type='tel'
                      className='serv-input'
                      value={servDraft}
                      onChange={e => {
                        const raw = e.target.value
                        setServDraft(raw)
                        const v = Number(raw)
                        if (raw !== '' && Number.isInteger(v)) changeServings(v)
                      }}
                      onBlur={() =>
                        setServDraft(servingSize ? String(servingSize) : '')
                      }
                    />
                    <span className='serv-unit'>serv</span>
                    <button
                      type='button'
                      className='step-btn'
                      onClick={() => changeServings((servingSize || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              <ul className='ing-list'>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <li className='ing skeleton-row' key={i}>
                        <Skeleton baseColor={skeletonColor} height={40} />
                      </li>
                    ))
                  : ingredients.map(renderIngredient)}
              </ul>
              {!loading && currRecipe?.servingPrice ? (
                <div className='price-line'>
                  Estimated{' '}
                  <strong>
                    {formatPrice(currRecipe.servingPrice * (servingSize || currRecipe.servings))}
                  </strong>{' '}
                  total · {formatPrice(currRecipe.servingPrice)}/serving
                </div>
              ) : null}
            </section>

            <section className='card instructions-card'>
              <h2>Instructions</h2>
              <ol className='step-list'>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <li className='step' key={i}>
                        <span className='num'>{i + 1}</span>
                        <Skeleton baseColor={skeletonColor} count={2} />
                      </li>
                    ))
                  : instructions.map(renderInstruction)}
              </ol>
            </section>

            {!loading && currRecipe?.nutritionLabels && currRecipe.nutritionLabels.length > 0 && (
              <section className='card tags-card'>
                <h2>Tags</h2>
                <div className='tag-list'>
                  {currRecipe.nutritionLabels.map(tag => (
                    <Link key={tag} className='tag' to={`/recipes?dietTags=${tag}`}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className='made-row'>
              {recipeId && <MadeRecipeBtn recipeId={recipeId} />}
            </div>

            {currRecipe?.nutritionData && (
              <NutritionData
                data={currRecipe.nutritionData}
                servings={currRecipe.servings}
              />
            )}

          </div>

          {!loading && currRecipe && (
            <RatingsAndReviews
              recipeId={currRecipe._id}
              ratingVal={currRecipe.rating && currRecipe.rating.rateValue}
              ratingCount={currRecipe.rating && currRecipe.rating.rateCount}
              currUserReview={currUserReview}
              setCurrUserReview={setCurrUserReview}
              isOwner={isOwner}
            />
          )}

          {!loading && currRecipe && !isOwner && (
            <div className='sr-report-foot'>
              <span>See something wrong with this recipe?</span>
              <ReportControl
                target={{ targetType: 'recipe', recipeId: currRecipe._id }}
              />
            </div>
          )}

          {!loading && currRecipe && (
            <PrintableRecipe
              ref={printedRef}
              recipe={currRecipe}
              ingredients={ingredients}
              instructions={instructions}
              servingSize={servingSize}
            />
          )}
        </div>
      )}
    </>
  )
}

export default SingleRecipe
