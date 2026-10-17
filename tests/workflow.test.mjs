import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../src/analysis.js';
import {discover,discoveryQueries} from '../src/discovery.js';
import {reportLines} from '../src/report.js';
const original='Community education improves sustainable development through practical learning and local collaboration. Independent discussion explores long term economic benefits in rural regions.';
test('quotation exclusion removes words from numerator and denominator',()=>{
 const text='This introduction provides context. "'+original+'" A separate paragraph explains the findings.';
 const r=analyze(text,[{text:original}],{excludeQuotes:true});assert.equal(r.matchedWords,0);assert.ok(r.excludedWords>0);assert.equal(r.wordCount-r.excludedWords,r.eligibleWords);assert.equal(r.similarity,0);
});
test('reference heading exclusion keeps earlier text eligible',()=>{
 const text=original+'\nReferences\n'+original;
 const r=analyze(text,[{text:original}],{excludeReferences:true});assert.equal(r.similarity,100);assert.equal(r.excludedRanges.length,1);assert.equal(r.eligibleWords,analyze(original,[]).wordCount);
});
test('longer minimum avoids a seven-word-only match',()=>{
 const text='Community education improves sustainable development through practical additional original reasoning is presented here.';
 const r=analyze(text,[{text:original}],{minWords:10});assert.equal(r.similarity,0);
});
test('source offsets point to actual source evidence',()=>{const source='A preface. '+original;const r=analyze(original,[{text:source}]);for(const p of r.sources[0].passages){assert.equal(source.slice(p.sourceStart,p.sourceEnd),p.sourceText);assert.equal(original.slice(p.start,p.end),p.text);}});
test('automatic discovery is bounded and deduplicates repeated public sources',async()=>{
 const queries=discoveryQueries(original);assert.ok(queries.length>0&&queries.length<=3);assert.ok(queries.every(q=>q.length<=180));
 const r=await discover(original,async()=>({sources:[{name:'Education',text:original,url:'https://en.wikipedia.org/?curid=1'}]}));assert.equal(r.sources.length,1);assert.equal(r.coverage.state,'completed');assert.ok(r.sources[0].retrievedAt);
});
test('all failed searches cannot become a successful no-match report',async()=>{const r=await discover(original,async()=>{throw Error('offline');});assert.equal(r.coverage.state,'failed');assert.equal(r.sources.length,0);assert.equal(analyze(original,r.sources).similarity,null);});
test('partial and empty search coverage remain distinct',async()=>{
 let n=0;const r=await discover(original,async()=>{if(n++===0)throw Error('offline');return {sources:[]};});assert.equal(r.coverage.state,'partial');
 const empty=await discover(original,async()=>({sources:[]}));assert.equal(empty.coverage.state,'empty');
});
test('discovery rejects unsafe or unrelated source links',async()=>{const r=await discover(original,async()=>({sources:[{text:original,url:'javascript:alert(1)'},{text:original,url:'https://example.com'}]}));assert.equal(r.sources.length,0);});
test('export includes coverage, exact evidence, and unavailability of AI detection',()=>{const r=analyze(original,[{text:original}]);r.coverage={state:'failed',sourceCount:0,outcomes:[]};r.analyzedAt=new Date().toISOString();const lines=reportLines({name:'Paper',result:r}).join('\n');assert.match(lines,/Public discovery: failed/);assert.match(lines,/AI detection unavailable/);assert.match(lines,/Source, characters/);});
