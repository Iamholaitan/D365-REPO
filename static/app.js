import {analyze, tokens} from '../src/analysis.js';
import {extractFile} from '../src/extract.js';
const $ = id => document.getElementById(id);
let sources = [], lastReport = null;
const status = text => { $('status').textContent = text; };
function count() { $('words').textContent = `${tokens($('paper').value).length.toLocaleString()} words`; }
function invalidate() { lastReport=null; $('report').hidden=true; }
$('paper').addEventListener('input',()=>{count();invalidate();});
$('clear').onclick=()=>{$('paper').value='';$('paperFile').value='';count();invalidate();};
async function upload(file) {
  if(!file) return null;
  return extractFile(file);
}
async function loadPaper(file) {try{status('Reading your document…');const text=await upload(file);if(text!==null){$('paper').value=text;count();invalidate();status(`Loaded ${file.name}.`);}}catch(e){status(e.message);}}
$('paperFile').onchange=e=>loadPaper(e.target.files[0]);
['dragenter','dragover'].forEach(event=>$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.add('over');}));
['dragleave','drop'].forEach(event=>$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.remove('over');}));
$('drop').addEventListener('drop',e=>loadPaper(e.dataTransfer.files[0]));
function renderSources(){
  $('sources').replaceChildren();
  sources.forEach((source,i)=>{const li=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');name.textContent=source.name;remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${source.name}`);remove.onclick=()=>{sources.splice(i,1);renderSources();invalidate();};li.append(name,remove);$('sources').append(li);});
  $('sourceCount').textContent=`${sources.length} of 20 sources added`;
}
function addSource(name,text,url=null){if(sources.length>=20)throw Error('You can add up to 20 sources.');if(!text.trim())throw Error('Add some reference text first.');sources.push({name:name.trim()||`Reference ${sources.length+1}`,text,url});renderSources();invalidate();}
$('addSource').onclick=()=>{try{addSource($('sourceName').value,$('sourceText').value);$('sourceName').value='';$('sourceText').value='';status('Source added.');}catch(e){status(e.message);}};
$('sourceFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;status('Reading source…');addSource(file.name,await upload(file));status('Source added.');}catch(e){status(e.message);}finally{e.target.value='';}};
$('analyze').onclick=async()=>{
  const button=$('analyze');button.disabled=true;invalidate();status('Comparing your paper…');
  const snapshot=JSON.stringify({text:$('paper').value,sources});
  try{
    if($('sourceText').value.trim())throw Error('Click “Add source” to include your reference text before checking.');
    await new Promise(resolve=>setTimeout(resolve,0));
    const submitted=JSON.parse(snapshot);
    const data=analyze(submitted.text,submitted.sources);
    if(snapshot!==JSON.stringify({text:$('paper').value,sources}))throw Error('Your documents changed during analysis. Please check again.');
    lastReport=data;$('score').textContent=data.similarity===null?'Not checked':`${data.similarity}%`;
    $('scoreDetail').textContent=data.similarity===null?'Add reference sources to check for matching text.':`${data.matchedWords} of ${data.wordCount} words overlap with ${data.sources.length} supplied source(s).`;
    $('assessment').textContent=data.writing.enoughText?data.writing.assessment:'Not enough text for writing indicators';
    $('metrics').textContent=data.writing.enoughText?`Average sentence: ${data.writing.averageSentence} words · Sentence-length variation: ${data.writing.variation} · Common academic transitions: ${data.writing.transitions}`:'Use at least 200 words. Even with more text, these signals cannot establish authorship.';
    $('matches').replaceChildren();
    const hits=data.sources.filter(s=>s.words);
    if(!hits.length){const p=document.createElement('p');p.textContent=data.sources.length?'No exact matches of seven or more words found in your supplied references. Paraphrases and unprovided sources were not checked.':'No references supplied. Similarity has not been checked.';$('matches').append(p);}
    hits.forEach(s=>{const box=document.createElement('div');box.className='match';const title=document.createElement('h3');title.textContent=`${s.name} · ${s.percent}% overlap`;box.append(title);if(s.url){const link=document.createElement('a');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='View public source ↗';box.append(link);}s.passages.forEach(p=>{const quote=document.createElement('blockquote');quote.textContent=p.text;box.append(quote);});$('matches').append(box);});
    $('report').hidden=false;status('Report complete. Review matches and limitations below.');$('report').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){status(e.message);}finally{button.disabled=false;}
};
$('download').onclick=()=>{if(!lastReport)return;const r=lastReport;const content=`ORIGINALITY REPORT\nGenerated: ${new Date().toISOString()}\nWords: ${r.wordCount}\nSimilarity: ${r.similarity===null?'Not checked':r.similarity+'%'}\n\nWRITING INDICATORS\n${r.writing.enoughText?r.writing.assessment:'Not enough text for style checks'}\nNot an AI authorship verdict.\n\nMATCHED SOURCES\n${r.sources.map(s=>`${s.name}: ${s.percent}%${s.url?' ('+s.url+')':''}\n${s.passages.map(p=>p.text).join('\n\n')}`).join('\n\n')}\n\nLIMITATIONS\n${r.limitations}`;const url=URL.createObjectURL(new Blob([content],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='originality-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

$('webSearch').onclick=async()=>{
  const button=$('webSearch');button.disabled=true;$('webStatus').textContent='Searching English Wikipedia…';$('webResults').replaceChildren();
  try{
    const res=await fetch('/api/web-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:$('webQuery').value})});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Search is unavailable.');
    $('webStatus').textContent=data.sources.length?data.coverage:'No articles found. Try another topic. Your paper has not been web-checked.';
    data.sources.forEach(source=>{
      const box=document.createElement('div');box.className='web-result';
      const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.name;
      const summary=document.createElement('p');summary.textContent=source.text.slice(0,220)+'…';
      const add=document.createElement('button');add.className='secondary';add.textContent='Add to comparison';
      add.onclick=()=>{try{addSource(source.name,source.text,source.url);add.disabled=true;add.textContent='Added';status('Public source added. Run the check to include it in your report.');}catch(e){status(e.message);}};
      box.append(link,summary,add);$('webResults').append(box);
    });
  }catch(e){$('webStatus').textContent=e.message;}finally{button.disabled=false;}
};
$('phraseSearch').onclick=()=>{
  const phrase=$('webQuery').value.trim();
  if(phrase.length<3||phrase.length>200){$('webStatus').textContent='Enter a topic or phrase of 3–200 characters.';return;}
  window.open('https://www.google.com/search?q='+encodeURIComponent('"'+phrase+'"'),'_blank','noopener,noreferrer');
};
