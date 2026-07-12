import React, { FC } from 'react'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'
import './RouteFallback.scss'

// Suspense fallback shown while a lazy route's chunk downloads. Rendered
// inside Layout, so the nav/footer shell stays mounted around it. The spinner
// sits behind the house flash-guard (docs/design/loading-states.md): a chunk
// that arrives quickly never shows one, while the container keeps its height
// from the first frame so the footer doesn't jump.
const RouteFallback: FC = () => {
  const showSpinner = useDelayedLoading(true)
  return (
    <div className='route-fallback' role='status' aria-label='Loading page'>
      {showSpinner && (
        <TailSpin height='40' width='40' color={spinnerColor} ariaLabel='loading' />
      )}
    </div>
  )
}

export default RouteFallback
