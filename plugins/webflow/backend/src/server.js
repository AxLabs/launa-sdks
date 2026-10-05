/**
 * Minimal OAuth callback server for Webflow Data API (custom code registration).
 * Set WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, WEBFLOW_REDIRECT_URI.
 */
import http from "node:http"
import { URL } from "node:url"

const PORT = Number(process.env.PORT ?? 3002)
const CLIENT_ID = process.env.WEBFLOW_CLIENT_ID ?? ""
const CLIENT_SECRET = process.env.WEBFLOW_CLIENT_SECRET ?? ""
const REDIRECT_URI = process.env.WEBFLOW_REDIRECT_URI ?? `http://localhost:${PORT}/oauth/callback`

function html(body) {
  return `<!DOCTYPE html><html><body>${body}</body></html>`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`)

  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true }))
    return
  }

  if (url.pathname === "/oauth/start") {
    const authUrl = new URL("https://webflow.com/oauth/authorize")
    authUrl.searchParams.set("client_id", CLIENT_ID)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI)
    authUrl.searchParams.set(
      "scope",
      "sites:read sites:write custom_code:read custom_code:write",
    )
    res.writeHead(302, { Location: authUrl.toString() })
    res.end()
    return
  }

  if (url.pathname === "/oauth/callback") {
    const code = url.searchParams.get("code")
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" })
      res.end(html("<p>Missing code</p>"))
      return
    }
    const tokenRes = await fetch("https://api.webflow.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    })
    const tokenBody = await tokenRes.text()
    res.writeHead(tokenRes.ok ? 200 : 500, { "Content-Type": "text/html" })
    res.end(
      html(
        tokenRes.ok
          ? `<p>OAuth complete. Store token server-side.</p><pre>${tokenBody}</pre>`
          : `<p>Token exchange failed</p><pre>${tokenBody}</pre>`,
      ),
    )
    return
  }

  res.writeHead(404)
  res.end("Not found")
})

server.listen(PORT, () => {
  console.log(`Launa Webflow OAuth backend on http://localhost:${PORT}`)
})
