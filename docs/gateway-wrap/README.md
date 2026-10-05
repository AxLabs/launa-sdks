# Gateway wrap

Monetize an existing HTTP API through the Launa hosted gateway.

## Flow

```
Buyer (x402 client) → gateway hostname → 402 + payment requirements
                    → pay + retry → 200 + proxied upstream response
```

## Steps

1. Sign up and verify email in the [Launa dashboard](https://launa.io)
2. Register an API with upstream base URL and pay-to wallet
3. Add endpoints (method, path pattern, x402 accept options)
4. Publish default subdomain or verify custom domain (CNAME + TXT)
5. Test with a buyer client against your gateway hostname

## When to use

- You have a REST API and want per-request billing
- You prefer DNS + dashboard over embedding payment code
- Buyers are agents, scripts, or wallets

## Related

- [Buyer clients](../buyers/README.md)
- [SDK integration](../sdk-integration/README.md)
- Dashboard: [launa.io/docs/gateway-wrap](https://launa.io/docs/gateway-wrap)
