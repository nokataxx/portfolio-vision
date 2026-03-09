/**
 * Yahoo Finance プロキシミドルウェア
 *
 * Yahoo Finance API は Cookie + Crumb 認証が必要。
 * 1. https://fc.yahoo.com/curveball にアクセスして Cookie を取得
 * 2. Cookie を使って https://query2.finance.yahoo.com/v1/test/getcrumb で crumb を取得
 * 3. 以降のリクエストに Cookie と crumb パラメータを付与
 */

import type { Connect } from 'vite'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const YAHOO_BASE = 'https://query2.finance.yahoo.com'

let cachedCookie = ''
let cachedCrumb = ''
let lastAuthTime = 0
const AUTH_TTL = 30 * 60 * 1000 // 30分

async function authenticate(): Promise<void> {
  // Step 1: Cookie を取得
  const consentRes = await fetch('https://fc.yahoo.com/curveball', {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'manual',
  })
  const setCookies = consentRes.headers.getSetCookie?.() ?? []
  cachedCookie = setCookies
    .map((c) => c.split(';')[0])
    .join('; ')

  // Set-Cookie が取れなかった場合、レスポンスヘッダーから直接取得を試みる
  if (!cachedCookie) {
    const raw = consentRes.headers.get('set-cookie') ?? ''
    cachedCookie = raw
      .split(',')
      .map((c) => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ')
  }

  // Step 2: Crumb を取得
  const crumbRes = await fetch(`${YAHOO_BASE}/v1/test/getcrumb`, {
    headers: {
      'User-Agent': USER_AGENT,
      Cookie: cachedCookie,
    },
  })

  if (!crumbRes.ok) {
    throw new Error(`Failed to get crumb: ${crumbRes.status}`)
  }

  cachedCrumb = await crumbRes.text()
  lastAuthTime = Date.now()
}

async function ensureAuth(): Promise<void> {
  if (Date.now() - lastAuthTime > AUTH_TTL || !cachedCrumb) {
    await authenticate()
  }
}

export function yahooFinanceProxy(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/yahoo-finance/')) {
      return next()
    }

    const apiPath = req.url.replace(/^\/api\/yahoo-finance/, '')

    try {
      await ensureAuth()

      // crumb パラメータを追加
      const separator = apiPath.includes('?') ? '&' : '?'
      const targetUrl = `${YAHOO_BASE}${apiPath}${separator}crumb=${encodeURIComponent(cachedCrumb)}`

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          Cookie: cachedCookie,
          Accept: 'application/json',
        },
      })

      // 401/403 の場合は認証をリセットしてリトライ
      if (response.status === 401 || response.status === 403) {
        lastAuthTime = 0
        await ensureAuth()

        const retryUrl = `${YAHOO_BASE}${apiPath}${separator}crumb=${encodeURIComponent(cachedCrumb)}`
        const retryRes = await fetch(retryUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            Cookie: cachedCookie,
            Accept: 'application/json',
          },
        })

        res.writeHead(retryRes.status, {
          'Content-Type': retryRes.headers.get('content-type') ?? 'application/json',
        })
        const body = await retryRes.text()
        res.end(body)
        return
      }

      res.writeHead(response.status, {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      })
      const body = await response.text()
      res.end(body)
    } catch (error) {
      console.error('[yahoo-finance-proxy]', error)
      res.writeHead(502, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Yahoo Finance proxy error' }))
    }
  }
}
