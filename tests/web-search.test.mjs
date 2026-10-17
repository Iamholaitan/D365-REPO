import test from 'node:test';
import assert from 'node:assert/strict';
import {handler,searchWikipedia} from '../netlify/functions/web-search.mjs';
test('fixed provider and source provenance',async()=>{
 const sources=await searchWikipedia('education',async(url,options)=>{
  assert.equal(new URL(url).hostname,'en.wikipedia.org');assert.equal(new URL(url).searchParams.get('gsrsearch'),'education');assert.equal(options.redirect,'error');
  return {ok:true,json:async()=>({query:{pages:{1:{pageid:1,title:'Education',extract:'Example source content',index:1}}}})};
 });assert.equal(sources[0].text,'Example source content');assert.equal(sources[0].url,'https://en.wikipedia.org/?curid=1');
});
test('empty discovery does not claim originality',async()=>assert.deepEqual(await searchWikipedia('xyz',async()=>({ok:true,json:async()=>({})})),[]));
test('provider failures remain failures',async()=>assert.rejects(()=>searchWikipedia('education',async()=>({ok:false}))));
test('API errors remain failures',async()=>assert.rejects(()=>searchWikipedia('education',async()=>({ok:true,json:async()=>({error:{code:'failure'}})}))));
test('invalid requests rejected before network',async()=>{assert.equal((await handler({httpMethod:'GET'})).statusCode,405);for(const body of ['{','{}','{"query":"x"}',JSON.stringify({query:'x'.repeat(201)})])assert.equal((await handler({httpMethod:'POST',body})).statusCode,400);});
