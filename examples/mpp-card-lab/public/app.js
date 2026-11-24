const $=id=>document.getElementById(id);
let config, stripe, card, selected='success', current, busy=false;
const attempts=new Map(), localEvents=new Map();
const stringify=x=>JSON.stringify(x,null,2);
const labels={authentication_required:'Buyer authentication required',ready:'Offer ready',delivered:'API delivered',rejected:'Payment rejected',revoked:'Access revoked',needs_reconciliation:'Check payment status',issuing_token:'Token creation pending',submitted:'Payment submitted',inspecting:'Inspecting offer'};
function setBusy(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);render();}
function scenario(){return config.scenarios.find(s=>s.id===selected);}
function trace(){return [...(localEvents.get(current?.id)||[]),...(current?.trace||[])].sort((a,b)=>a.time.localeCompare(b.time));}
function event(step,status,body){if(!current)return;const events=localEvents.get(current.id)||[];events.push({time:new Date().toISOString(),step,status,body});localEvents.set(current.id,events);}
function render(){
  if(!config)return;
  $('copy-card').textContent=scenario().card;$('expected').textContent=scenario().expected;
  document.querySelectorAll('.scenario').forEach(b=>{b.classList.toggle('selected',b.dataset.id===selected);b.setAttribute('aria-pressed',String(b.dataset.id===selected));});
  $('status').textContent=current?(labels[current.state]||current.state):'Ready to test';
  $('http').textContent=current?.result?'HTTP '+current.result.status:'NO REQUEST';
  $('pi').textContent=current?.provider?.paymentIntent||'—';$('provider').textContent=current?.provider?.status?(current.provider.status+(current.provider.disputed?' · disputed':'')):'—';
  $('refunded').textContent=current?.provider?'$'+((current.provider.refunded||0)/100).toFixed(2):'—';
  $('receipt').textContent=current?.receipt?stringify(current.receipt):'No payment receipt.';
  $('response').textContent=current?.result?typeof current.result.body==='string'?current.result.body:stringify(current.result.body):'No response yet.';
  $('authenticate').disabled=busy||current?.state!=='authentication_required'||!config.issuerMode;
  $('cancel-auth').disabled=busy||current?.state!=='authentication_required';
  $('issuer-mode').textContent=config.issuerMode?'Token issuer mode: interactive 3DS available.':'Test-helper mode: no issuer-side 3DS action. Configure a separate sandbox issuer profile to complete authentication.';
  $('retry').disabled=busy||!current?.canRetry;$('refresh').disabled=busy||!current||current.state==='ready';
  const refundable=current?.provider?.status==='succeeded'&&!current.provider.disputed&&current.provider.refunded<100;
  $('partial').disabled=busy||!refundable||current.provider.refunded>60||!!current.pendingRefund;$('refund').disabled=busy||!refundable||!!current.pendingRefund;
  $('pending-refund').hidden=!current?.pendingRefund;$('pending-refund').disabled=busy;
  // Starting another payment is always an explicit new attempt; never reset an uncertain attempt silently.
  $('pay').disabled=busy||!!current&&current.state!=='ready';$('fixture').disabled=$('pay').disabled;
  const debug=$('debug');debug.replaceChildren();
  for(const [i,t] of trace().entries()){
    const details=document.createElement('details'),summary=document.createElement('summary'),time=document.createElement('time'),name=document.createElement('span'),status=document.createElement('strong'),pre=document.createElement('pre');
    time.textContent=new Date(t.time).toLocaleTimeString();name.textContent=`${String(i+1).padStart(2,'0')} · ${t.step}`;status.textContent=t.status??'INFO';pre.textContent=stringify(t);
    summary.append(time,name,status);details.append(summary,pre);details.open=i===trace().length-1;debug.append(details);
  }
  if(!trace().length){const p=document.createElement('p');p.className='empty';p.textContent='Responses appear here as you run a test.';debug.append(p);}
  const history=$('history');history.replaceChildren(new Option('Select an attempt',''));
  for(const a of [...attempts.values()].reverse())history.add(new Option(`${new Date(a.createdAt).toLocaleTimeString()} · ${a.scenario} · ${a.state}`,a.id));
  history.value=current?.id||'';
}
async function action(url,data){
  const response=await fetch('/api/'+url,{method:'POST',headers:{'Content-Type':'application/json','X-Lab-Token':config.csrf},body:JSON.stringify(data)});
  const result=await response.json();
  if(result.attempt){current=result.attempt;attempts.set(current.id,current);render();}
  if(!response.ok)throw Error(result.error||'Local server request failed.');
  return result;
}
async function run(fn){if(busy)return;setBusy(true);$('status').dataset.error='false';try{await fn();}catch(e){$('notice').textContent=e.message;$('status').dataset.error='true';}finally{setBusy(false);}}
async function prepare(){await action('prepare',{scenario:selected});$('notice').textContent='Verified USD 1.00 MPP offer. The challenge expires in about five minutes.';}
async function pay(fixture){
  if(!current)await prepare();
  if(current.state!=='ready')throw Error('Inspect a new offer to begin a separate payment. Retry or reconcile the current attempt first if its outcome is uncertain.');
  let paymentMethod;
  if(!fixture){
    const result=await stripe.createPaymentMethod({type:'card',card});
    // Card numbers and CVC stay inside Stripe Elements. Display only safe PM response fields.
    event('Stripe.js payment method',result.error?'ERROR':'OK',result.error?{type:result.error.type,code:result.error.code,message:result.error.message}:{id:result.paymentMethod.id,type:result.paymentMethod.type,livemode:result.paymentMethod.livemode,card:{brand:result.paymentMethod.card.brand,last4:result.paymentMethod.card.last4,exp_month:result.paymentMethod.card.exp_month,exp_year:result.paymentMethod.card.exp_year}});
    if(result.error)throw Error(result.error.message);
    if(result.paymentMethod.livemode)throw Error('Only test payment methods are accepted.');
    paymentMethod=result.paymentMethod.id;
  }
  $('notice').textContent='Submitting one sandbox payment. Waiting for the gateway and Stripe…';
  await action('pay',{id:current.id,fixture,paymentMethod});
  $('notice').textContent=current.state==='delivered'?'Payment accepted. The API response and MPP receipt are below.':scenario().expected+' · Review the debug responses below.';
}
$('inspect').onclick=()=>run(prepare);$('pay').onclick=()=>run(()=>pay(false));$('fixture').onclick=()=>run(()=>pay(true));
$('retry').onclick=()=>run(async()=>{await action('retry',{id:current.id});$('notice').textContent='Retried the original credential against the exact same URL. No new token was created.';});
$('authenticate').onclick=()=>run(async()=>{
  const response=await action('authenticate',{id:current.id});
  const result=await stripe.handleNextAction({hashedValue:response.authentication.hashedValue});
  event('Stripe.js issuer authentication',result?.error?'ERROR':'RETURNED',{code:result?.error?.code||null,action:'[redacted]'});
  await action('retry',{id:current.id});
  $('notice').textContent=result?.error?'Authentication did not complete. Review the saved attempt; cancel or retry without creating another token.':'Authentication returned. The gateway response below is authoritative.';
});
$('cancel-auth').onclick=()=>run(async()=>{await action('cancel',{id:current.id});$('notice').textContent='Cancellation requested for the original payment. Only a confirmed cancelled response permits a new payment.';});
$('refresh').onclick=()=>run(async()=>{await action('refresh',{id:current.id});$('notice').textContent='Stripe status refreshed. Use Retry to check gateway access after webhook processing.';});
$('partial').onclick=()=>run(async()=>{await action('refund',{id:current.id,amount:40});$('notice').textContent='Sandbox refund submitted. Retry the saved credential after webhook processing.';});
$('refund').onclick=()=>run(async()=>{await action('refund',{id:current.id,amount:'remaining'});$('notice').textContent='Remaining sandbox amount refunded. Retry after webhook processing.';});
$('pending-refund').onclick=()=>run(async()=>{await action('refund',{id:current.id,amount:current.pendingRefund});$('notice').textContent='Pending refund reconciled using its original idempotency key.';});
$('history').onchange=e=>{current=attempts.get(e.target.value);if(current)selected=current.scenario;render();};
$('copy-card').onclick=()=>navigator.clipboard.writeText(scenario().card.replaceAll(' ',''));
$('copy-debug').onclick=()=>navigator.clipboard.writeText(stringify(trace()));
$('download').onclick=()=>{const u=URL.createObjectURL(new Blob([stringify({attempt:current?.id,events:trace()})],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='launa-mpp-'+(current?.id||'trace')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
try{
  const response=await fetch('/api/config');config=await response.json();
  for(const a of [...config.attempts].reverse())attempts.set(a.id,a);
  $('gateway').value=config.gateway;
  if(config.localGateway)$('test-scope').textContent='Local gateway acceptance: the changed backend and gateway run against disposable MongoDB and the linked seller’s real Stripe sandbox. Staging itself is unchanged.';
  for(const s of config.scenarios){const b=document.createElement('button');b.className='scenario';b.dataset.id=s.id;b.textContent=s.name;b.onclick=()=>{if(busy)return;selected=s.id;current=undefined;$('notice').textContent=s.expected;render();};$('scenarios').append(b);}
  stripe=Stripe(config.publishableKey,config.account?{stripeAccount:config.account}:{});
  card=stripe.elements().create('card',{style:{base:{fontSize:'15px',color:'#26341b',fontFamily:'system-ui, sans-serif'}},hidePostalCode:true});card.mount('#card-element');
  card.on('change',e=>$('card-error').textContent=e.error?.message||'');render();
}catch(e){$('notice').textContent='Setup error: '+e.message;}
