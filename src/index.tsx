import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import './index.scss'
import App from 'src/App'
import { initSentry } from 'src/util/sentry'
import { stripStaticMeta } from 'src/util/seo'

// Init error monitoring before the app mounts so the global ErrorBoundary and
// the axios interceptor have a live client. No-ops without VITE_SENTRY_DSN.
initSentry()

// Drop the static <title>/og/twitter fallback tags from index.html now that JS
// is running. They exist for JS-less social crawlers; removing them before mount
// means React 19's per-route <Helmet> tags are the only copies in <head> (it
// hoists metadata natively and does NOT dedupe against pre-existing tags).
stripStaticMeta()

const queryClient = new QueryClient()

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      {process.env.NODE_ENV !== 'production' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  </React.StrictMode>
)
