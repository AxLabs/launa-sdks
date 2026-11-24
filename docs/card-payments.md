# Card payments through a seller's Stripe account

These card APIs are merged into staging. Package publication is separate; deploy the matching
backend and rebuild/publish the SDK, CLI, MCP and paywall together before using
them against a hosted service. Existing published 0.0.7 packages do not include
this feature.

Sellers link their Stripe account in the dashboard's Account page, separately in
Sandbox and Live. Cards are currently supported for permanent, read-only GET
endpoints, fixed USD prices of at least $0.50, and responses up to 5 MiB. The
seller receives the charge in their Stripe account. Existing x402 payments
continue to work. Hosted Checkout requires the buyer to complete payment in a
browser; this is not MPP or an OpenAI Wallet integration.

## Seller APIs

```ts
await client.cardPayments.connection();
await client.endpoints.create(apiId, {
  method: "GET", path_pattern: "/report", accepts: [],
  card_payment: { enabled: true, currency: "usd", amount_minor: "100" },
});
await client.cardPayments.list(); // latest 100 in the selected environment
```

Keep the existing `accepts` array to offer both cards and x402. On update,
`accepts: []` clears x402; omission/null preserves it. `card_payment: null`
removes card pricing; omission preserves it. A disabled card configuration is
also supported, provided another payment rail remains configured.

All SDKs expose connection, connect, complete, disconnect and payment history.

Disconnect requires the `id` of the connection the user selected, in the same
environment: TypeScript `client.cardPayments.disconnect(connection.id)`, Python
`client.card_payments.disconnect(connection["id"])`, or Go
`client.DisconnectStripe(ctx, connection.ID)`. The backend rejects a stale ID
with HTTP 409. Do not automatically read a replacement ID and retry a disconnect.
Link/unlink requires a JWT issued within 30 minutes; use the dashboard for the
interactive OAuth redirect. Do not put a seller JWT or API key into buyer requests.

| Surface | Connection / history |
| --- | --- |
| TypeScript | `client.cardPayments.connection()` / `.list()` |
| Python | `client.card_payments.connection()` / `.list()` |
| Go | `client.StripeConnection(ctx)` / `client.ListCardPayments(ctx)` |
| CLI | `launa cards connection --json` / `launa cards list --json` |
| MCP | `launa_stripe_connection` / `launa_card_payments` |

Reads require `payment_accounts:read` and `payments:read`. Endpoint writes use
`endpoints:write`. Existing API keys and OAuth grants must explicitly add the
new read scopes; permissions are not silently widened.

CLI endpoint creation/update accepts JSON through `--card-payment`:

```sh
launa endpoints create --api-id API_ID --method GET --path /report \
  --accepts '[]' \
  --card-payment '{"enabled":true,"currency":"usd","amount_minor":"100"}' --json
```

MCP `launa_add_endpoint`/`launa_update_endpoint` accept the same `card_payment`
object and `accepts` array. Stripe linking remains an interactive dashboard
operation. `launa pay url` continues to be the x402 buyer command.

## TypeScript buyer

```ts
import { CardCheckout } from "@launaio/sdk";

// Run only after the buyer chooses cards. Restore the saved token after reload.
const purchase = new CardCheckout("https://gateway.example/report", {
  token: savedPurchase?.token,
  headers: { Accept: "application/json" },
});
await savePurchaseSecurely({ url: purchase.url, token: purchase.token });
const state = await purchase.start();
// Present state.checkout_url to the user as a link to Stripe-hosted Checkout.
// After the user completes payment:
const response = await purchase.resume();
if (response.ok && response.status !== 202 && response.headers.has("Launa-Payment-Receipt")) {
  const report = await response.json();
} else {
  const status = await response.json(); // pending/refund/recovery state
}
```

`savePurchaseSecurely` is application-owned persistence, not an SDK function.
Persist before `start()` and reuse the same token, URL, query and headers after
network errors. `status()` only inspects the existing purchase. The helper
rejects mixed x402/card credentials and HTTPS redirects. A 202 response is not
API content. Never automatically create another token or fall back to x402
after an uncertain card payment.

## Python buyer

```python
from launa_sdk import CardCheckout

purchase = CardCheckout("https://gateway.example/report", token=saved_token)
save_purchase_securely(purchase.url, purchase.token)  # your persistence
try:
    state = purchase.start()
    # Display state.get("checkout_url"); wait for the buyer to finish.
    response = purchase.resume()
    if 200 <= response.status_code < 300 and response.status_code != 202 and "Launa-Payment-Receipt" in response.headers:
        report = response.json()
finally:
    purchase.close()
```

No crypto wallet extras are required for `CardCheckout`.

## Go buyer

```go
purchase, err := cards.New("https://gateway.example/report", savedToken)
if err != nil { return err }
// Persist purchase.URL and purchase.Token securely before Start.
state, err := purchase.Start(ctx)
if err != nil { return err } // retain token; same purchase on retry
// Display state.CheckoutURL and wait for the buyer.
response, err := purchase.Resume(ctx)
if err != nil { return err }
defer response.Body.Close()
// Require 2xx (other than 202) and Launa-Payment-Receipt before consuming content.
```

Import `github.com/AxLabs/launa-sdks/go/cards`. Seller endpoint inputs include
`*launa.CardPaymentConfig`. For Go updates, a nil `Accepts` slice preserves
pricing; an explicitly empty slice clears x402. Set `CardPayment.Enabled=false`
to disable cards without removing its saved price.

## React

```tsx
import { CardPaymentButton } from "@launaio/react-paywall";

<CardPaymentButton
  url="https://gateway.example/report"
  options={{ token: savedToken }}
  onToken={token => savePurchaseSecurely(token)}
  onPaid={response => consumePaidResponse(response)}
/>
```

The component offers an explicit card action, a Stripe link and a continue
button. It preserves the purchase across retries. `onToken` is mandatory and
must finish persistence before network activity. Supply the saved token when
remounting after reload. Restore the original request when URL or credentials
change; an existing purchase cannot be reassigned. The existing x402 paywall
components remain available alongside this button.

Allow the embedding application's exact origin in the API's CORS configuration,
including its port during local development. The gateway exposes
`Launa-Payment-Receipt` to approved origins so the component can verify delivery.
A blocked preflight is a configuration error, not evidence of a declined payment;
keep the original token when retrying after correcting the origin.

## Recovery

Gateway operations are GETs to the original resource with `Launa-Payment:
checkout|status|resume` and `Launa-Payment-Token`. Discovery uses
`Launa-Card-Payment`; a delivered resource includes `Launa-Payment-Receipt`.
Tokens are secret bearer capabilities and must not go in URLs, logs or analytics.

Payment/unused-access expiry is one hour. Successful responses are recoverable
from encrypted storage for 24 hours; retries do not execute the upstream again.
Known failures or unused paid entitlements queue a refund. A crash after an
execution claim can produce `recovery_required`; retain the token and contact
the seller with the purchase ID instead of paying again. `refund_pending` does
not mean money has already been returned. A removed endpoint can still recover
an existing cached result while its API hostname remains configured.


Staging may set `CARD_STRIPE_MODE=sandbox`, independently of settlement-package
billing, so both Launa environments use Stripe sandbox. Connections still belong
to a single Launa environment. `stripe_environment` identifies the provider mode.
Local disconnect disables that environment only; remove Launa in Stripe Dashboard
to revoke access to the account across all environments.

Overview/API stats expose optional `card_payments` totals. `paid_count` includes
verified payments later refunded or disputed; `delivered_count` counts each
completed purchase once. `gross_minor` and `refunded_minor` are USD minor units
before Stripe fees, for purchases created within the selected period. Existing
on-chain statistics retain their meaning. The recent payment list is limited to
100 rows and must not be summed to derive totals.

## Self-describing unpaid responses

Card-capable gateway builds now add `payment_options` to initial JSON 402 responses.
It lists crypto/x402, card/launa-checkout, or both from the endpoint configuration.
Card offers include a versioned `card_payment_flow` describing the token, headers,
checkout/status/resume operations, authorization and recovery. Inspect retains
these fields in `body`; existing `paymentRequired` and `cardPayment` remain intact.
No SDK upgrade is needed to read the raw response body. The x402 payment headers
and existing body fields remain unchanged. Payment-attempt errors and recovery
responses do not receive fresh-payment instructions. These are Launa discovery
fields, not MPP, and discovery does not authorize or initiate a payment.


The opt-in [MPP pilot](mpp.md) adds a separate native agent card path. Existing
CardCheckout helpers remain hosted Checkout; inspect recognizes the MPP offer.

The [local MPP card lab](../examples/mpp-card-lab/README.md) tests sandbox cards,
declines, issuer-side 3DS, failed-delivery refunds and disputes. The normal
`CardCheckout` helpers remain hosted Checkout clients; they do not create SPTs.

Seller payment list responses may include `authentication_expires_at` for MPP
`action_required` purchases. It is the server continuation deadline, not a wallet
token or proof of cancellation. After it passes, reconcile the original attempt.
TypeScript and Go expose the optional field; Python preserves it in the response
dictionary. This additive field requires the updated backend deployment.
