import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig,validateChallenge,redact,guard} from './core.mjs';
const config={secretKey:'sk_test_fixture',publishableKey:'pk_test_fixture',account:'acct_fixture',profile:'profile_test_fixture',gateway:'https://example.staging.launa.dev'};
const challenge=()=>({realm:'example.staging.launa.dev',method:'stripe',intent:'charge',expires:new Date(Date.now()+240000).toISOString(),request:{amount:'100',currency:'usd',methodDetails:{networkId:config.profile,paymentMethodTypes:['card']}}});
test('sandbox configuration rejects live credentials and arbitrary destinations',()=>{
 assert.equal(validateConfig(config),config);
 for(const c of [{secretKey:'sk_live_fixture'},{publishableKey:'pk_live_fixture'},{gateway:'https://staging.launa.dev.attacker.example'},{gateway:'http://example.staging.launa.dev'},{gateway:'https://example.staging.launa.dev/path'},{profile:'profile_live_fixture'}])assert.throws(()=>validateConfig({...config,...c}));
});
test('challenge is bound to USD 1, seller, card method and fresh expiry',()=>{
 validateChallenge(challenge(),config);
 for(const field of ['amount','currency']){const c=challenge();c.request[field]='unexpected';assert.throws(()=>validateChallenge(c,config));}
 const c=challenge();c.request.methodDetails.networkId='profile_test_other';assert.throws(()=>validateChallenge(c,config));
 const expired=challenge();expired.expires=new Date(0).toISOString();assert.throws(()=>validateChallenge(expired,config));
 const far=challenge();far.expires=new Date(Date.now()+3600000).toISOString();assert.throws(()=>validateChallenge(far,config));
});
test('local POST requests require exact host, origin and CSRF token',()=>{
 const req={method:'POST',headers:{host:'127.0.0.1:4319',origin:'http://127.0.0.1:4319','x-lab-token':'secret','content-type':'application/json'}};
 guard(req,'http://127.0.0.1:4319','secret');
 for(const key of ['host','origin','x-lab-token','content-type'])assert.throws(()=>guard({...req,headers:{...req.headers,[key]:'bad'}},'http://127.0.0.1:4319','secret'));
});
test('trace redaction removes tokens from nested provider and gateway responses',()=>{
 const out=redact({authorization:'Payment private',nested:[{id:'spt_secret',message:'key sk_test_private and pi_test_secret_private',client_secret:'hidden'}],cookie:'session=secret',status:402});
 const text=JSON.stringify(out);assert(!text.includes('private'));assert(!text.includes('spt_secret'));assert.equal(out.status,402);
});

test('issuer configuration and authentication values stay sandbox-only and redacted',()=>{
 const valid={secretKey:'sk_test_fixture',publishableKey:'pk_test_fixture',account:'acct_seller',profile:'profile_test_fixture',gateway:'https://test.staging.launa.dev',issuer:{secretKey:'sk_test_issuer',publishableKey:'pk_test_issuer'}};
 assert.equal(validateConfig(valid).issuer.secretKey,'sk_test_issuer');
 assert.throws(()=>validateConfig({...valid,issuer:{...valid.issuer,secretKey:'sk_live_forbidden'}}));
 assert.deepEqual(redact({authentication:{hashedValue:'private-action'},next_action:{use_stripe_sdk:{value:'private-action'}}}),{authentication:{hashedValue:'[redacted]'},next_action:'[redacted]'});
});

test('local gateway opt-in is limited to the fixed loopback harness and realm',()=>{
 const local={...config,gateway:'http://127.0.0.1:4321',localGateway:true};
 assert.equal(validateConfig(local).gateway,local.gateway);
 for(const gateway of ['http://127.0.0.1:4322','http://localhost:4321','http://10.0.0.1:4321','http://127.0.0.1:4321/other'])assert.throws(()=>validateConfig({...local,gateway}));
 assert.throws(()=>validateConfig({...local,localGateway:false}));
 assert.throws(()=>validateChallenge({...challenge(),realm:'attacker.example'},config));
});
