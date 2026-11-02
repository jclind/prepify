// Forwards prepifymeals.com/api/* to the Express API on Railway.
//
// Some networks' DNS blocks *.railway.app, including through a CNAME like
// api.prepifymeals.com, so a browser calling Railway directly gets
// ERR_NAME_NOT_RESOLVED and the site shows no recipes. With VITE_API_URL set to
// `same-origin` (src/api/http-common.ts), the browser only talks to the site's
// own domain and this function makes the Railway call from Netlify's edge.
//
// It runs before the SPA fallback in public/_redirects, because a returned
// Response ends the request chain.
//
// Env vars (scope must include Functions):
// - API_PROXY_TARGET: the Railway origin to forward to. Set per deploy context:
//   the prod service for production, the dev service for deploy previews.
// - EDGE_PROXY_SECRET: shared with the server, which only trusts
//   X-Prepify-Client-Ip when X-Prepify-Edge carries this value
//   (server/middleware/edgeProxy.js).

declare const Netlify: { env: { get(name: string): string | undefined } }

type EdgeContext = { ip: string }

// Hop-by-hop and transport headers that must not be copied between the two
// connections. accept-encoding is dropped so the edge's fetch negotiates (and
// transparently decodes) compression itself; Netlify re-compresses for the
// browser.
const DROP_REQUEST_HEADERS = ['host', 'connection', 'accept-encoding', 'content-length']
const DROP_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']

export default async (request: Request, context: EdgeContext) => {
  const target = Netlify.env.get('API_PROXY_TARGET')
  const secret = Netlify.env.get('EDGE_PROXY_SECRET')
  if (!target || !secret) {
    return Response.json({ error: 'The API proxy is not configured.' }, { status: 502 })
  }

  const incoming = new URL(request.url)
  const upstream = new URL(incoming.pathname + incoming.search, target)

  const headers = new Headers(request.headers)
  for (const name of DROP_REQUEST_HEADERS) headers.delete(name)
  // set() replaces anything the browser sent under these names.
  headers.set('x-prepify-edge', secret)
  headers.set('x-prepify-client-ip', context.ip)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  let response: Response
  try {
    response = await fetch(upstream, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
    })
  } catch {
    return Response.json(
      { error: 'Could not reach the Prepify API. Please try again.' },
      { status: 502 }
    )
  }

  const responseHeaders = new Headers(response.headers)
  for (const name of DROP_RESPONSE_HEADERS) responseHeaders.delete(name)
  // Per-user data must never be stored by the edge or any shared cache. The
  // server sends this too; setting it here covers an older server build.
  responseHeaders.set('cache-control', 'private, no-store')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const config = { path: '/api/*' }
