export function tokens(text) {
  return [...text.matchAll(/[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)?/gu)].map(m=>({value:m[0].toLowerCase(),start:m.index,end:m.index+m[0].length}));
}
export function analyze(text,sources=[],settings={}) {
  if(typeof text!=='string'||text.length<50||text.length>200000)throw Error('Enter between 50 and 200,000 characters for your paper.');
  if(!Array.isArray(sources)||sources.length>60)throw Error('Use up to 60 combined reference documents.');
  const options={minWords:settings.minWords??7,excludeQuotes:!!settings.excludeQuotes,excludeReferences:!!settings.excludeReferences};
  if(!Number.isInteger(options.minWords)||options.minWords<7||options.minWords>20)throw Error('Minimum match length must be between 7 and 20 words.');
  const words=tokens(text),values=words.map(w=>w.value),covered=new Set(),excludedRanges=[];
  if(options.excludeQuotes)for(const m of text.matchAll(/“[^”]*”|"[^"\n]*"/g))excludedRanges.push({start:m.index,end:m.index+m[0].length,reason:'Quotation'});
  if(options.excludeReferences){const m=/^\s*(references|bibliography|works cited)\s*:?\s*$/im.exec(text);if(m)excludedRanges.push({start:m.index,end:text.length,reason:'Reference section'});}
  const eligible=words.map(w=>!excludedRanges.some(r=>w.start>=r.start&&w.end<=r.end));
  const eligibleWords=eligible.filter(Boolean).length;
  const reports=sources.map(source=>{
    if(typeof source?.text!=='string'||source.text.length>200000)throw Error('Each reference must contain at most 200,000 characters.');
    const refWords=tokens(source.text),ref=refWords.map(w=>w.value),windows=new Map(),hits=new Set(),positions=new Map(),size=options.minWords;
    for(let i=0;i<=ref.length-size;i++){const key=ref.slice(i,i+size).join(' ');if(!windows.has(key))windows.set(key,i);}
    for(let i=0;i<=values.length-size;i++){
      if(!eligible.slice(i,i+size).every(Boolean))continue;
      const position=windows.get(values.slice(i,i+size).join(' '));
      if(position!==undefined)for(let j=i;j<i+size;j++){hits.add(j);covered.add(j);if(!positions.has(j))positions.set(j,position+j-i);}
    }
    const spans=[];
    for(const i of [...hits].sort((a,b)=>a-b)){
      if(spans.length&&i===spans.at(-1)[1]&&positions.get(i)===positions.get(i-1)+1)spans.at(-1)[1]=i+1;
      else spans.push([i,i+1]);
    }
    return {name:String(source.name||'Reference').slice(0,150),url:source.url||null,retrievedAt:source.retrievedAt||null,words:hits.size,percent:Math.round(1000*hits.size/Math.max(1,eligibleWords))/10,
      passages:spans.map(([a,b])=>{const sourceStart=refWords[positions.get(a)].start,sourceEnd=refWords[positions.get(b-1)].end;return {type:'Exact match',start:words[a].start,end:words[b-1].end,text:text.slice(words[a].start,words[b-1].end),sourceStart,sourceEnd,sourceText:source.text.slice(sourceStart,sourceEnd)};})};
  });
  return {wordCount:words.length,eligibleWords,excludedWords:words.length-eligibleWords,excludedRanges,options,
    similarity:sources.length&&eligibleWords?Math.round(1000*covered.size/eligibleWords)/10:null,matchedWords:covered.size,sources:reports.sort((a,b)=>b.words-a.words),
    writing:{available:false,enoughText:words.length>=200,assessment:'No validated AI detection model is connected.'},
    limitations:'Only the added local references, optional batch papers, and discovered English Wikipedia extracts are compared. Discovery samples up to three keyword queries, not the entire paper or web. Extracts can be incomplete. Turnitin, private repositories, paraphrases and semantic similarity are not checked. Exclusions use simple quotation and reference-heading rules. Similarity is not proof of plagiarism.'};
}
