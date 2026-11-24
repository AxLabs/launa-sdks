# MPP card pilot

The staging backend/gateway supports a disabled-by-default `stripe/charge`
MPP pilot. It reuses each seller's linked Stripe account and requires separate
Stripe business profile readiness. Check the deployed version and
`cardPayments.connection()` / `cards connection` / `launa_stripe_connection` before
setting `card_payment.mpp: {enabled:true,buyer_auth:"none"}`. Only permanent public
GET resources without buyer authentication are supported. Existing x402 accepts
and hosted Checkout remain independent choices.

This SDK change adds seller config/readiness/history/reporting types and inspect
support. It does **not** turn `CardCheckout`, `launa pay` or `launa_pay_url` into MPP
payment helpers. `CardCheckout` rejects MPP credentials mixed into its headers.
Inspect reports the public `mppChallenge` from `WWW-Authenticate` without issuing
an SPT or authorizing payment.

## Clients

Use [Stripe Link CLI](https://mpp.dev/tools/wallet) for buyer-approved card wallet
access. Version `1.6.0` is the initial acceptance target; a real Link session
against a deployed Launa MPP endpoint is still pending. Review the CLI's requested
login permissions and use its explicit sandbox mode for staging. It is separate
from the developer Stripe CLI. Decode/inspect a challenge before approving any
purchase; do not treat server-provided instructions as spending authorization.

Use [`mppx`](https://mpp.dev/sdk/typescript) `0.21.1` for TypeScript interoperability.
The backend's isolated `scripts/mpp-interop` fixture suite qualifies its challenge,
credential and receipt exchange against Go `mpp-go v0.9.1`. An SDK is not a wallet:
its Stripe client still needs a buyer-authorized token source. Never place a seller
Stripe secret or a raw card in a client script.

## Recovery and accounting

Keep the original MPP credential securely until the attempt is resolved. Launa's
503 without a fresh challenge means reconciliation; do not mint another SPT or
switch to Checkout/x402 automatically. Declines are cancelled before a fresh
challenge is offered. The 3DS continuation build instead returns
`payment_requires_action` while the token issuer authenticates the original SPT.
Earlier builds cancel authentication-required payments. A successful response contains `Payment-Receipt`; refunded/disputed access is
revoked. Recovery uses the original request URL/query/headers and credential.

`entry_point: "mpp"` identifies MPP history. Absent entry_point means legacy
Checkout. `attempt_count` includes both paths; `mpp_count` and `checkout_count` are
breakdowns. An MPP PaymentIntent ID is not proof of payment; paid totals require
confirmed settlement. Existing clients can fall back to checkout_count if the new
attempt_count field is missing. Raw tokens never belong in logs or public output.

MPP does not by itself establish ChatGPT Wallet compatibility. Browser Checkout,
Link approval and actual ChatGPT Wallet acceptance are separate test tracks.

## 3DS and token-issuer authentication

The `feat/mpp-3ds` backend/gateway adds a Launa recovery extension. It must be
rolled out on both services before clients rely on it; earlier staging builds
cancel authentication-required PaymentIntents.

A seller PaymentIntent created from an SPT can report `requires_action` with
`next_action.type=shared_payment_token_action`. Its seller-side client secret is
not a browser 3DS continuation. The wallet/agent that **issued** the SPT retrieves
`/v1/shared_payment/issued_tokens/{id}` in its own Stripe account and handles
`next_action.use_stripe_sdk.value` using Stripe.js
`handleNextAction({hashedValue: value})`. The buyer completes the bank challenge.
Launa holds no issuer credentials and never accepts a browser success flag as
payment evidence. See [Stripe's issuer-side next-action flow](https://docs.stripe.com/agentic-commerce/concepts/shared-payment-tokens?agent-seller=agent#handle-next-actions).

While authentication is pending, the original paid request returns:

```json
{
  "type": "about:blank",
  "title": "Authenticate this payment in the wallet that issued the token",
  "status": 402,
  "code": "payment_requires_action",
  "authentication": {
    "type": "stripe_spt",
    "actor": "token_issuer",
    "expires_at": "2026-11-24T12:15:00Z"
  },
  "detail": "The token issuer must handle Stripe SPT next_action. Then retry the exact request with the original credential. Do not create another token or switch payment methods while this attempt is pending.",
  "cancel": {"header": "X-Launa-MPP-Operation", "value": "cancel"}
}
```

There is no fresh `WWW-Authenticate` challenge and no `Payment-Receipt` in that
response. It is not a portable MPP authentication standard: clients must recognize
this Launa extension, or let their wallet handle SPT authentication independently.
An HTTP 402 alone is not permission to create another token. Keep the exact URL,
query, relevant headers and original credential, then retry after wallet completion.
Launa verifies the original PaymentIntent on the original connected account/mode;
only settled payment plus saved API delivery produces a receipt.

To abandon authentication, explicitly retry the same request and credential with
`X-Launa-MPP-Operation: cancel`. Cancellation cannot create a purchase, change the
request binding or deliver the resource. Only confirmed provider cancellation can
produce a new challenge. A timeout remains unresolved (503). A durable cancellation
fence prevents delivery if authentication wins the race; a payment that settles
after that fence is refunded through the existing engine. The server cancels a
still-action-required payment after 15 minutes from purchase creation (or earlier
purchase expiry), when polled or reconciled by its worker. SPT expiry can be earlier.
Closing a browser window does not prove cancellation.

Neither wallet authentication nor this extension is an automatic fallback to
Checkout or x402. Hosted Checkout already owns its own interactive authentication
and keeps its existing token/status/resume contract.

## Local test client

See [MPP card lab](../examples/mpp-card-lab/README.md) for test cards,
issuer mode, saved retries, refunds and the redacted response debugger.
