# CORS for buyer paywall plugins

Browser-based paywalls (Framer, Webflow, Payload frontend) call the **gateway URL** directly. The gateway must return CORS headers on **402** and **200** responses or the browser blocks the inspect/unlock flow.

## Required headers (gateway / upstream)

- `Access-Control-Allow-Origin` — your site origin, or `*` for public content APIs
- `Access-Control-Expose-Headers` — include x402 payment headers (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`, or legacy `X-PAYMENT*`)

Launa-hosted gateways set these when the seller configures allowed origins in the dashboard.

## Local development

Proxy gateway requests through your dev server so the browser sees same-origin requests:

```ts
// vite.config.ts
export default {
  server: {
    proxy: {
      '/gateway': {
        target: 'https://echo.staging.launa.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gateway/, ''),
      },
    },
  },
}
```

Use `resourceUrl: '/gateway/echo/get?test=1'` during development.

## Framer / Webflow

Published sites run on Framer/Webflow origins. Ensure the gateway URL hostname allows those origins, or use a seller custom domain on the gateway with CORS configured.
