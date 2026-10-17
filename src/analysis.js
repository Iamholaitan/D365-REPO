export function tokens(text) {
  return [...text.matchAll(/[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)?/gu)].map(m=>({value:m[0].toLowerCase(),start:m.index,end:m.index+m[0].length}));
}
export function analyze(text,sources=[]) {
  if(typeof text!=='string'||text.length<50||text.length>200000)throw Error('Enter between 50 and 200,000 characters for your paper.');
  if(!Array.isArray(sources)||sources.length>20)throw Error('Use up to 20 reference documents.');
  const words=tokens(text), values=words.map(w=>w.value), covered=new Set();
  const reports=sources.map(source=>{
    if(typeof source?.text!=='string'||source.text.length>200000)throw Error('Each reference must contain at most 200,000 characters.');
    const ref=tokens(source.text).map(w=>w.value),windows=new Set(),hits=new Set();
    for(let i=0;i<=ref.length-7;i++)windows.add(ref.slice(i,i+7).join(' '));
    for(let i=0;i<=values.length-7;i++)if(windows.has(values.slice(i,i+7).join(' ')))for(let j=i;j<i+7;j++){hits.add(j);covered.add(j);}
    const spans=[];
    for(const i of [...hits].sort((a,b)=>a-b)){if(spans.length&&i===spans.at(-1)[1])spans.at(-1)[1]=i+1;else spans.push([i,i+1]);}
    return {name:String(source.name||'Reference').slice(0,150),url:source.url||null,words:hits.size,percent:Math.round(1000*hits.size/Math.max(1,words.length))/10,
      passages:spans.map(([a,b])=>({start:words[a].start,end:words[b-1].end,text:text.slice(words[a].start,words[b-1].end)}))};
  });
  const sentences=text.split(/[.!?]+/).map(s=>tokens(s).length).filter(n=>n>=3),avg=sentences.reduce((a,b)=>a+b,0)/(sentences.length||1);
  const variation=avg?Math.sqrt(sentences.reduce((a,b)=>a+(b-avg)**2,0)/sentences.length)/avg:0;
  const transitions=(text.match(/\b(?:in conclusion|furthermore|moreover|it is important to note|in today.s world|delve into)\b/gi)||[]).length;
  return {wordCount:words.length,similarity:sources.length?Math.round(1000*covered.size/Math.max(1,words.length))/10:null,matchedWords:covered.size,sources:reports.sort((a,b)=>b.words-a.words),
    writing:{sentences:sentences.length,averageSentence:Math.round(avg*10)/10,variation:Math.round(variation*100)/100,transitions,enoughText:words.length>=200,
      assessment:words.length>=200&&(variation<.35||transitions>=4)?'Some repetitive style signals':'No strong pattern in these limited style checks'},
    limitations:'Similarity compares only the source text added to this report, using exact sequences of seven or more words. Public web discovery searches English Wikipedia only; downloaded extracts may be incomplete. This is not a complete internet or Turnitin database scan. Quoted and cited passages are included. Style signals cannot establish AI authorship.'};
}
