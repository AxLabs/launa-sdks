export const scenarios = [
  {id:'success', name:'Successful payment', card:'4242 4242 4242 4242', fixture:'pm_card_visa', path:'/get', expected:'200 · API response and payment receipt'},
  {id:'decline', name:'Card declined', card:'4000 0000 0000 0002', fixture:'pm_card_visa_chargeDeclined', path:'/get', expected:'402 · Cancelled payment, no API delivery'},
  {id:'authentication', name:'Authentication required', card:'4000 0025 0000 3155', fixture:'pm_card_threeDSecure2Required', path:'/get', expected:'402 · Authenticate in the token issuer, then retry the original credential. Requires the 3DS backend/gateway build and issuer mode.'},
  {id:'dispute', name:'Disputed payment', card:'4000 0000 0000 0259', fixture:'pm_card_createDispute', path:'/get', expected:'Stripe creates a dispute asynchronously; access is revoked once processed'},
  {id:'failure', name:'Upstream failure → refund', card:'4242 4242 4242 4242', fixture:'pm_card_visa', path:'/status/500', expected:'503 initially · Automatic refund, then 410 on retry'}
];
export function validateConfig(c) {
  if (!c.secretKey?.startsWith('sk_test_') || !c.publishableKey?.startsWith('pk_test_')) throw Error('Only Stripe sandbox keys are supported.');
  if (!/^acct_[A-Za-z0-9]+$/.test(c.account) || !c.profile?.startsWith('profile_test_')) throw Error('A sandbox connected account and profile are required.');
  const u = new URL(c.gateway);
  if (!(c.localGateway===true && u.origin==='http://127.0.0.1:4321') && (u.protocol !== 'https:' || !u.hostname.endsWith('.staging.launa.dev') || u.port) || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw Error('Gateway must be a staging.launa.dev HTTPS origin.');
  if (c.issuer && (!c.issuer.secretKey?.startsWith('sk_test_') || !c.issuer.publishableKey?.startsWith('pk_test_') || (c.issuer.account && !/^acct_[A-Za-z0-9]+$/.test(c.issuer.account)))) throw Error('Issuer mode requires sandbox keys and an optional connected account.');
  return c;
}
export function validateChallenge(challenge, c) {
  const r=challenge.request;
  if(challenge.realm!==new URL(c.gateway).hostname)throw Error('Challenge realm does not match the configured gateway.');
  if (challenge.method!=='stripe' || challenge.intent!=='charge' || r?.amount!=='100' || r.currency!=='usd' || r.methodDetails?.networkId!==c.profile || !r.methodDetails?.paymentMethodTypes?.includes('card')) throw Error('Challenge does not match the approved seller and USD 1.00 card payment.');
  const remaining=Date.parse(challenge.expires)-Date.now();
  if (!(remaining>0 && remaining<=310000)) throw Error('Challenge expiry is invalid or expired.');
}
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/^(authorization|cookie|set-cookie|client_secret|hashedValue|next_action|secretKey|credential|spt|access_token|refresh_token|device_code|number|cvc)$/i.test(k)?'[redacted]':redact(v)]));
  if (typeof value==='string') return value.replace(/\b(?:spt_|sk_test_|sk_live_|rk_test_|rk_live_|launa_live_|launa_sandbox_)[A-Za-z0-9_]+/g,'[redacted]').replace(/\b(?:pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/g,'[redacted]');
  return value;
}
export function guard(req, origin, token) {
  if (req.headers.host !== new URL(origin).host) throw Error('Invalid local host.');
  if (req.method==='POST' && (req.headers.origin!==origin || req.headers['x-lab-token']!==token || !req.headers['content-type']?.startsWith('application/json'))) throw Error('Local page authorization required.');
}
