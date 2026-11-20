# MPP card pilot (unreleased)

The `feat/mpp` backend/gateway build supports a disabled-by-default `stripe/charge`
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
switch to Checkout/x402 automatically. A decline or additional authentication is
cancelled before a fresh challenge is offered; this pilot cannot fulfill interactive
3DS. A successful response contains `Payment-Receipt`; refunded/disputed access is
revoked. Recovery uses the original request URL/query/headers and credential.

`entry_point: "mpp"` identifies MPP history. Absent entry_point means legacy
Checkout. `attempt_count` includes both paths; `mpp_count` and `checkout_count` are
breakdowns. An MPP PaymentIntent ID is not proof of payment; paid totals require
confirmed settlement. Existing clients can fall back to checkout_count if the new
attempt_count field is missing. Raw tokens never belong in logs or public output.

MPP does not by itself establish ChatGPT Wallet compatibility. Browser Checkout,
Link approval and actual ChatGPT Wallet acceptance are separate test tracks.
