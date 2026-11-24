import http from 'node:http';
import {randomUUID, randomBytes} from 'node:crypto';
import {readFile, writeFile, mkdir, readdir, rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Challenge, Credential, Receipt} from 'mppx';
import {scenarios, validateConfig, validateChallenge, redact, guard} from './core.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
if (!process.env.LAUNA_MPP_LAB_CONFIG) throw Error('Set LAUNA_MPP_LAB_CONFIG to a private JSON config file. See README.md.');
const config=validateConfig(JSON.parse(await readFile(process.env.LAUNA_MPP_LAB_CONFIG,'utf8')));
const port=Number(process.env.PORT || 4319), origin=`http://127.0.0.1:${port}`;
const csrf=randomBytes(32).toString('hex');
const stateDir=process.env.LAUNA_MPP_LAB_STATE || path.join(path.dirname(process.env.LAUNA_MPP_LAB_CONFIG),'card-lab-state');
await mkdir(stateDir,{recursive:true,mode:0o700});
const attempts=new Map(), locks=new Set();
for (const name of await readdir(stateDir)) if (/^[a-f0-9-]+\.json$/.test(name)) {
  const a=JSON.parse(await readFile(path.join(stateDir,name),'utf8'));
  if(a.account===config.account && a.profile===config.profile && new URL(a.url).origin===config.gateway) attempts.set(a.id,a);
}
async function save(a) {
  const file=path.join(stateDir,a.id+'.json');
  await writeFile(file+'.tmp',JSON.stringify(a),{mode:0o600}); await rename(file+'.tmp',file);
}
function trace(a,step,status,headers,body,request) {
  a.trace.push(redact({time:new Date().toISOString(),step,request,status,headers,body}));
}
function view(a) {
  return redact({id:a.id,url:a.url,scenario:a.scenario,state:a.state,createdAt:a.createdAt,canRetry:!!a.credential,pendingRefund:a.pendingRefund?.request,receipt:a.receipt,provider:a.provider,result:a.result,trace:a.trace});
}
async function fetchLogged(a,step,url,options={}) {
  let response;
  try { response=await fetch(url,{...options,redirect:'error',signal:AbortSignal.timeout(80000)}); }
  catch { trace(a,step,null,{},'Network error or timeout. Outcome may be unknown; do not create a new payment.'); await save(a); throw Error('Network failure. Keep this attempt and reconcile it before starting another payment.'); }
  const text=await response.text(); let body; try{body=JSON.parse(text);}catch{body=text;}
  trace(a,step,response.status,Object.fromEntries(response.headers),body,{method:options.method||'GET',url});
  return {response,body};
}
async function stripe(a,step,resource,data,idem,issuer=false) {
  const headers={Authorization:`Bearer ${config.secretKey}`,'Stripe-Account':config.account,'Stripe-Version':'2026-07-29.preview'};
  if(issuer){if(!config.issuer)throw Error('Configure a separate sandbox token issuer to test interactive 3DS.');headers.Authorization=`Bearer ${config.issuer.secretKey}`;delete headers['Stripe-Account'];if(config.issuer.account)headers['Stripe-Account']=config.issuer.account;}
  if(data) headers['Content-Type']='application/x-www-form-urlencoded';
  if(idem) headers['Idempotency-Key']=idem;
  const result=await fetchLogged(a,step,`https://api.stripe.com/v1/${resource}`,{method:data?'POST':'GET',headers,body:data?new URLSearchParams(data):undefined});
  if(!result.response.ok) throw Error(`Stripe rejected ${step} (HTTP ${result.response.status}). See the redacted debug response.`);
  return result.body;
}
async function gateway(a,credential,operation) {
  const headers={Accept:'application/json','User-Agent':'Launa-MPP-Card-Lab/1.0'};
  if(credential) headers.Authorization=credential;
  if(operation)headers['X-Launa-MPP-Operation']=operation;
  const r=await fetchLogged(a,credential?'Gateway payment / retry':'Gateway discovery',a.url,{headers});
  a.result={status:r.response.status,body:redact(r.body)};
  if(credential){
    a.receipt=r.response.headers.has('payment-receipt')?Receipt.fromResponse(r.response):null;
    a.state=r.response.status===402 && r.body?.code==='payment_requires_action'?'authentication_required':r.response.status===200?'delivered':r.response.status===410?'revoked':r.response.status===402?'rejected':'needs_reconciliation';
  }
  await save(a);return r;
}
async function reconcile(a) {
  if(!a.submittedAt) return;
  const params=new URLSearchParams({'created[gte]':String(Math.floor(a.submittedAt/1000)-5),limit:'100'});
  let list=await stripe(a,'Stripe payment lookup','payment_intents?'+params), all=[...list.data], pages=1;
  while(list.has_more && pages++<10){params.set('starting_after',list.data.at(-1).id);list=await stripe(a,'Stripe payment lookup','payment_intents?'+params);all.push(...list.data);}
  const matches=all.filter(p=>p.metadata?.mpp_challenge_id===a.challenge.id);
  if(matches.length>1) throw Error('Multiple payments found for one challenge. Investigate before further actions.');
  if(!matches.length){a.provider={note:'No matching PaymentIntent found yet. Refresh later; do not create another token.'};await save(a);return;}
  const pi=matches[0];
  if(pi.livemode!==false || pi.amount!==100 || pi.currency!=='usd') throw Error('Payment is outside the sandbox test scope.');
  a.paymentIntent=pi.id;
  a.provider={paymentIntent:pi.id,status:pi.status,amount:pi.amount,received:pi.amount_received,refunded:0,disputed:false};
  if(pi.latest_charge){
    const charge=await stripe(a,'Stripe charge','charges/'+pi.latest_charge);
    if(charge.livemode!==false) throw Error('Unexpected live charge.');
    a.provider.refunded=charge.amount_refunded;a.provider.disputed=charge.disputed;
    if(charge.disputed){
      const disputes=await stripe(a,'Stripe disputes','disputes?charge='+encodeURIComponent(charge.id));
      a.provider.disputes=disputes.data.map(d=>({id:d.id,status:d.status}));
    }
  }
  await save(a);
}
async function body(req) {let s='';for await(const b of req){s+=b;if(s.length>16000)throw Error('Request too large.');}return JSON.parse(s||'{}');}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
const server=http.createServer(async(req,res)=>{
  let a,locked;
  try {
    guard(req,origin,csrf);
    const u=new URL(req.url,origin);
    if(req.method==='GET' && ['/','/app.js','/style.css'].includes(u.pathname)) {
      const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
      res.writeHead(200,{'Content-Type':file.endsWith('html')?'text/html':file.endsWith('js')?'text/javascript':'text/css','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com; connect-src 'self' https://api.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.stripe.com; frame-ancestors 'none'"});
      res.end(await readFile(path.join(dir,'public',file)));return;
    }
    if(req.method==='GET' && u.pathname==='/api/config'){json(res,200,{csrf,publishableKey:config.issuer?.publishableKey||config.publishableKey,account:config.issuer?config.issuer.account:config.account,issuerMode:!!config.issuer,localGateway:!!config.localGateway,gateway:config.gateway,scenarios,attempts:[...attempts.values()].map(view).reverse().slice(0,20)});return;}
    if(req.method!=='POST') {json(res,404,{error:'Not found'});return;}
    const b=await body(req);
    if(u.pathname==='/api/prepare'){
      const scenario=scenarios.find(s=>s.id===b.scenario);if(!scenario)throw Error('Select a valid scenario.');
      if(attempts.size>=200)throw Error('This lab has reached 200 attempts. Archive its private state before continuing.');
      const id=randomUUID();a={id,account:config.account,profile:config.profile,scenario:scenario.id,url:config.gateway+scenario.path+'?test=mpp-lab-'+id,createdAt:new Date().toISOString(),state:'inspecting',trace:[]};
      attempts.set(id,a);await save(a);
      const r=await gateway(a);
      if(r.response.status!==402 || !r.response.headers.has('www-authenticate'))throw Error('Endpoint did not advertise an MPP challenge.');
      a.challenge=Challenge.deserialize(r.response.headers.get('www-authenticate'));validateChallenge(a.challenge,config);
      a.state='ready';trace(a,'Decoded MPP challenge',402,{},a.challenge);await save(a);
    }else{
      a=attempts.get(b.id);if(!a)throw Error('Unknown attempt.');
      if(locks.has(a.id))throw Error('An operation is already running for this attempt.');
      locks.add(a.id);locked=a.id;
      if(u.pathname==='/api/pay'){
        if(a.state!=='ready')throw Error('This attempt cannot issue another payment token. Use retry or refresh.');
        validateChallenge(a.challenge,config);
        const pm=b.fixture===true?scenarios.find(s=>s.id===a.scenario).fixture:b.paymentMethod;
        if(!/^pm_[A-Za-z0-9]+$/.test(pm||'') && !scenarios.some(s=>s.fixture===pm))throw Error('Enter a card using Stripe Elements or choose the test fixture.');
        a.state='issuing_token';a.submittedAt=Date.now();await save(a);
        const tokenData={'payment_method':pm,'usage_limits[currency]':'usd','usage_limits[max_amount]':'100','usage_limits[expires_at]':String(Math.floor(Date.parse(a.challenge.expires)/1000))};
        if(config.issuer)tokenData['seller_details[network_business_profile]']=config.profile;
        const t=await stripe(a,'Stripe sandbox token creation',config.issuer?'shared_payment/issued_tokens':'test_helpers/shared_payment/granted_tokens',tokenData,'mpp-card-lab-token-'+a.id,!!config.issuer);
        if(config.issuer)a.issuedToken=t.id;
        if(!t.id?.startsWith('spt_'))throw Error('Stripe returned an invalid test token.');
        a.credential=Credential.serialize({challenge:a.challenge,payload:{spt:t.id}});a.state='submitted';await save(a);
        await gateway(a,a.credential);await reconcile(a);
      } else if(u.pathname==='/api/authenticate'){
        if(!config.issuer || !a.issuedToken || a.state!=='authentication_required')throw Error('Authentication requires an issuer-mode token and a gateway awaiting 3DS.');
        const t=await stripe(a,'Stripe issuer authentication status','shared_payment/issued_tokens/'+encodeURIComponent(a.issuedToken),undefined,undefined,true);
        if(t.id!==a.issuedToken || t.livemode!==false)throw Error('Issuer token does not match this sandbox attempt.');
        const hashedValue=t.next_action?.use_stripe_sdk?.value;
        if(t.status!=='requires_action' || t.next_action?.type!=='use_stripe_sdk' || typeof hashedValue!=='string' || hashedValue.length>65536)throw Error('No supported issuer authentication action. Retry the original credential to reconcile; do not pay again.');
        await save(a);json(res,200,{attempt:view(a),authentication:{hashedValue}});return;
      } else if(u.pathname==='/api/cancel'){
        if(!a.credential || a.state!=='authentication_required')throw Error('Only an authentication-pending MPP attempt can be cancelled here.');
        await gateway(a,a.credential,'cancel');await reconcile(a);
      } else if(u.pathname==='/api/retry'){
        if(!a.credential)throw Error('No saved payment credential.');
        await gateway(a,a.credential);await reconcile(a);
      } else if(u.pathname==='/api/refresh') await reconcile(a);
      else if(u.pathname==='/api/refund'){
        await reconcile(a);
        if(!a.paymentIntent || a.provider.status!=='succeeded' || a.provider.disputed)throw Error('Refund requires a settled, undisputed sandbox payment from this lab.');
        if(a.pendingRefund && a.pendingRefund.request!==b.amount)throw Error('Reconcile the pending refund before requesting a different amount.');
        const amount=a.pendingRefund?.amount ?? (b.amount==='remaining'?100-a.provider.refunded:b.amount===40?40:0);
        if(!a.pendingRefund && (amount<=0 || amount>100-a.provider.refunded))throw Error('Refund amount exceeds the remaining payment.');
        // Persist the operation before sending. A timeout must reuse the same idempotency key.
        a.pendingRefund ||= {amount,request:b.amount,key:'mpp-card-lab-refund-'+a.id+'-'+a.provider.refunded+'-'+amount};await save(a);
        await stripe(a,'Stripe refund','refunds',{'payment_intent':a.paymentIntent,amount:String(amount)},a.pendingRefund.key);
        delete a.pendingRefund;await save(a);await reconcile(a);
      } else throw Error('Unknown action.');
    }
    json(res,200,{attempt:view(a)});
  }catch(e){
    if(a){trace(a,'Lab error',null,{},redact(e.message));await save(a);}
    json(res,400,{error:redact(e.message),...(a?{attempt:view(a)}:{})});
  }finally{if(locked)locks.delete(locked);}
});
server.listen(port,'127.0.0.1',()=>console.log(`MPP card lab: ${origin} (Stripe sandbox only)`));
