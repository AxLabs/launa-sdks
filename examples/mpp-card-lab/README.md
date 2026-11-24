# Local MPP card lab

Browser-based, sandbox-only manual acceptance testing for Launa's MPP Stripe card
flow. Uses Stripe Elements for card entry and mppx 0.21.1 for challenge parsing,
credential serialization and receipt parsing. No Link wallet is required.

## Start

From this directory:

```sh
pnpm install --ignore-workspace
LAUNA_MPP_LAB_CONFIG=/absolute/path/to/private-config.json pnpm start
```

Open http://127.0.0.1:4319. The server binds only to loopback. `PORT` overrides
4319. Keep private config/state outside the repository, with permissions 0600
(files) and 0700 (directory). Example config shape:

```json
{
  "secretKey": "sk_test_REPLACE",
  "publishableKey": "pk_test_REPLACE",
  "account": "acct_CONNECTED_SELLER",
  "profile": "profile_test_SELLER_PROFILE",
  "gateway": "https://YOUR_API.staging.launa.dev"
}
```

The publishable and secret keys must belong to the same Stripe sandbox platform;
all card creation, token creation and provider operations use the configured
seller's connected account. Use the dedicated card-acceptance secret, not billing
credentials. Only the publishable key is returned to the browser. The lab refuses
live keys, live profiles, non-staging gateway origins, and offers other than USD
1.00 for the configured seller. It never accepts an arbitrary target URL from the
browser. Configure `/get` and `/status/500` as MPP-enabled public GET endpoints.

## Manual scenarios

Select a scenario, optionally inspect its offer, then enter the displayed card
number in Stripe Elements (future expiry, e.g. 12/34; CVC 123). Click **Pay $1.00
with entered test card**. Alternatively, **Run selected test-card fixture** uses a
Stripe test PaymentMethod without card entry. Each new attempt uses its own query
parameter; all retries preserve that attempt's exact URL and credential.

| Scenario | Expected behavior |
| --- | --- |
| Successful payment | 200, upstream response and MPP receipt; retry returns cached delivery |
| Card declined | 402 after confirmed cancellation; no paid delivery |
| Authentication required | Continuation build returns 402 payment_requires_action; issuer mode can authenticate, cancel or retry the same attempt |
| Disputed payment | Stripe creates an asynchronous sandbox dispute; access becomes 410 after webhook processing |
| Upstream failure | `/status/500`: initial 503, automatic refund, then 410 |

Successful payments can be partially refunded ($0.40) or refunded for their
remaining amount. Refund operations are restricted to this lab's own sandbox
payments. **Refresh Stripe status** reads provider state; **Retry saved
credential** checks gateway behavior without issuing another token. An uncertain
response is not permission to start a new payment. Issuance/submission state and
credentials are persisted before gateway calls; after restarting, select the
attempt in history. Do not delete private state while outcomes are uncertain.

The debug panel contains redacted gateway/Stripe response headers and bodies,
decoded challenges, receipts, refund/dispute results and safe Stripe.js payment
method fields. Copy/download exports never include secret keys, SPTs or saved
authorization credentials. Provider traces can include sandbox account metadata;
review them before sharing. Raw card fields stay inside Stripe's iframe.

This is an operator test tool, not a buyer wallet, production token issuer or
replacement for hosted Checkout. The Stripe `test_helpers` endpoint is sandbox
only. Dispute webhook timing can race API delivery; a successful charge does not
guarantee the resource was delivered.

## Verify

```sh
pnpm test
```

Tests cover sandbox/recipient/amount boundaries, local request authorization and
credential redaction. Use the page for the actual staging acceptance run.

References: [Stripe test cards](https://docs.stripe.com/testing),
[MPP Stripe client](https://mpp.dev/payment-methods/stripe#client).


## Issuer mode and 3DS

A test-helper granted token does not give this lab the buyer issuer's next action.
To test real sandbox 3DS, add a separate sandbox issuer to the private configuration:

```json
"issuer": {
  "secretKey": "sk_test_REPLACE_LOCALLY",
  "publishableKey": "pk_test_REPLACE_LOCALLY",
  "account": "acct_OPTIONAL_CONNECTED_ISSUER"
}
```

Omit `account` when the issuer is the platform itself. Its private Stripe business
profile must exist and differ from the seller profile. Both keys must belong to
that issuer context. The outer account/profile/secret still select the seller;
they are never used as a substitute for missing issuer access. Keep the config
outside Git with mode 0600. Restart the lab after configuring it.

Issuer mode collects test cards in the issuer's Stripe Elements context and uses
`shared_payment/issued_tokens`, scoped to the selected seller, USD 1.00 and expiry.
After a gateway `payment_requires_action` response, **Authenticate test payment**
retrieves the issued token server-side and calls Stripe.js with its `hashedValue`.
Complete or fail the Stripe sandbox challenge, then inspect the original gateway
retry. **Cancel pending authentication** sends the original credential with the
Launa cancellation extension. It never creates a replacement payment.

Both backend and gateway must have the 3DS continuation build. An older gateway
may cancel the payment immediately. A `shared_payment_token_action` on the seller
PI cannot be completed using that PI's client secret. The lab does not claim Link
or ChatGPT Wallet acceptance. A pending or failed authentication is not a sale.

Debug output redacts issuer next actions, SPTs, credentials, API keys and client
secrets. The action value is returned only to the authorized local page for
Stripe.js, never to trace export. Browser completion is not trusted as settlement;
the gateway and provider read remain authoritative.

## Test an unmerged gateway locally

The backend's opt-in `TestLocalMPPSandboxHarness` runs its actual MPP HTTP handler,
service and Stripe provider against an isolated local MongoDB, while proxying the
public test upstream. It is skipped in ordinary tests and binds only
`127.0.0.1:4321`. Do not expose it publicly. See the backend authentication test
runbook for startup and teardown. For this harness only, the lab config accepts:

```json
"gateway": "http://127.0.0.1:4321",
"localGateway": true
```

This does not deploy anything or add rows to staging Income. The page labels the
local scope; validate local purchase totals in the disposable database. Remove
these overrides to return to the staging API after its backend and running gateway
have been upgraded. Restart preserves lab attempts and credentials in the private
state directory; retain the same harness signing key and database for recovery.
