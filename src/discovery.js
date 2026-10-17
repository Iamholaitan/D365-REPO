import {tokens} from './analysis.js';
const stop=new Set('this that these those their there which where when with from into have been were will would should could about study research project paper chapter introduction abstract references university department submitted student analysis results conclusion using also more than between through such only other some each both they them does what your our for and the are was not can has its but you all'.split(' '));
export function discoveryQueries(text){
  const words=tokens(text).map(t=>t.value).filter(w=>w.length>3&&!stop.has(w)&&!/^\d+$/.test(w));
  const queries=[];
  for(let n=0;n<3;n++){
    const segment=words.slice(Math.floor(n*words.length/3),Math.floor((n+1)*words.length/3));
    const counts=new Map();for(const word of segment)counts.set(word,(counts.get(word)||0)+1);
    const query=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,4).map(([word])=>word).join(' ').slice(0,180);
    if(query.length>=3&&!queries.includes(query))queries.push(query);
  }
  return queries;
}
export async function discover(text,search,onProgress=()=>{}){
  const queries=discoveryQueries(text),sources=[],seen=new Set(),outcomes=[];
  for(const query of queries){
    onProgress(query);
    try{
      const result=await search(query);
      if(!Array.isArray(result.sources))throw Error('Invalid search response.');
      outcomes.push({query,state:result.sources.length?'found':'empty',count:result.sources.length});
      for(const source of result.sources){
        if(!source||typeof source.text!=='string'||!source.text.trim())continue;
        let url;try{url=new URL(source.url);}catch{continue;}
        if(url.protocol!=='https:'||url.hostname!=='en.wikipedia.org')continue;
        if(!seen.has(url.href)){sources.push({...source,url:url.href,text:source.text.slice(0,18000),retrievedAt:new Date().toISOString()});seen.add(url.href);}
      }
    }catch{outcomes.push({query,state:'failed',count:0});}
  }
  const failures=outcomes.filter(o=>o.state==='failed').length;
  return {sources,coverage:{provider:'English Wikipedia',state:!queries.length?'no-query':failures===queries.length?'failed':failures?'partial':sources.length?'completed':'empty',outcomes,sourceCount:sources.length}};
}
