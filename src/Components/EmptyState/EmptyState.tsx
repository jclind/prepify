import React, { FC, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FiInbox } from 'react-icons/fi'
import './EmptyState.scss'

interface EmptyStateAction {
  label: string
  /** Render as a router Link when set… */
  to?: string
  /** …otherwise as a button. */
  onClick?: () => void
}

interface EmptyStateProps {
  /** Icon shown in the medallion; defaults to an inbox. */
  icon?: ReactNode
  title: string
  description?: ReactNode
  /** Optional call-to-action rendered as a pill (Link or button). */
  action?: EmptyStateAction
  className?: string
}

// Shared empty-state used across account sub-pages (Saved / Ratings / Recipes /
// Drafts) and anywhere else a "nothing here yet" message belongs: an icon
// medallion over a title, supporting copy, and an optional CTA pill.
const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={`empty-state ${className ?? ''}`.trim()}>
    <span className='empty-state__icon'>{icon ?? <FiInbox />}</span>
    <h2 className='empty-state__title'>{title}</h2>
    {description ? <p className='empty-state__text'>{description}</p> : null}
    {action ? (
      action.to ? (
        <Link to={action.to} className='empty-state__cta'>
          {action.label}
        </Link>
      ) : (
        <button
          type='button'
          className='empty-state__cta'
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )
    ) : null}
  </div>
)

export default EmptyState
