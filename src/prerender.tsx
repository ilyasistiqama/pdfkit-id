import { renderToString } from 'react-dom/server'
import App, { headFor } from './App'
import { matchRoute } from './site/routes'
import { headTags } from './site/head'

/** Render satu rute menjadi HTML statis + tag <head>. Dipakai script prerender. */
export function renderRoute(path: string) {
  const match = matchRoute(path)
  const html = renderToString(<App initialPath={path} />)
  return { html, head: headTags(headFor(match)) }
}

export { siteRoutes } from './site/routes'
export { CONTENT_UPDATED } from './site/site'
