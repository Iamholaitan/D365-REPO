import {tokens} from '../src/analysis.js';
import {analyzeAsync} from '../src/analysis-client.js';
import {extractFile} from '../src/extract.js';
import {discover} from '../src/discovery.js';
import {history} from '../src/storage.js';
import {downloadPDF,reportLines} from '../src/report.js';
import {config} from '../src/config.js';
const $=id=>document.getElementById(id);
let documents=[],references=[],selected=null,busy=false;
const status=text=>{$('status').textContent=text;};
const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const action=(label,fn)=>{const b=element('button',label,'secondary');b.type='button';b.disabled=busy;b.onclick=fn;return b;};
document.querySelectorAll('[data-brand]').forEach(e=>e.textContent=config.name);document.title=config.name+' — Free project checker';
function setBusy(value){busy=value;document.querySelectorAll('input,select,button').forEach(e=>e.disabled=value);}
function renderQueue(){
 $('queue').replaceChildren();
 for(const doc of documents){const row=element('div',undefined,'queue-row'),info=element('div');info.append(element('strong',doc.name),element('small',doc.state+((doc.error||doc.analysisError)?' — '+(doc.error||doc.analysisError):'')+(doc.storageError?' — Not saved: device storage unavailable':'')));row.append(info);
 if(doc.result)row.append(action('View report',()=>showReport(doc)));
 row.append(action(doc.error?'Remove failed file':'Remove',()=>{if(busy)return;documents=documents.filter(d=>d.id!==doc.id);if(selected?.id===doc.id){selected=null;$('report').hidden=true;}renderQueue();}));$('queue').append(row);}
}
function renderReferences(){
 $('sources').replaceChildren();for(const ref of references){const li=element('li');li.append(element('span',ref.name),action('Remove',()=>{if(busy)return;references=references.filter(r=>r!==ref);renderReferences();}));$('sources').append(li);}
}
async function persist(doc){if(!$('remember').checked)return;try{await history.save(doc);doc.storageError=false;}catch{doc.storageError=true;status('Report is available, but device storage failed. Download it before leaving.');}}
async function loadFiles(files,asReference=false){
 if(busy)return;const list=[...files];if(!list.length)return;setBusy(true);let succeeded=0;const failures=[];
 try{
  for(let i=0;i<list.length;i++){
   const file=list[i];$('uploadStatus').textContent=`Reading ${i+1} of ${list.length}: ${file.name}`;
   if((asReference?references:documents).length>=(asReference?config.maxReferences:config.maxPapers)){failures.push(`${file.name}: batch limit reached`);continue;}
   const doc={id:crypto.randomUUID(),name:file.name,createdAt:new Date().toISOString(),state:'Reading',text:'',result:null};
   if(!asReference){documents.push(doc);renderQueue();}
   try{
    const text=await extractFile(file);if(text.length<50)throw Error('At least 50 characters are needed.');
    const existing=(asReference?references:documents).find(d=>d.id!==doc.id&&d.text===text);
    if(existing)throw Error('Duplicate content already added.');
    if(asReference)references.push({id:doc.id,name:file.name,text});else{doc.text=text;doc.state=`Ready · ${tokens(text).length} words`;await persist(doc);}
    succeeded++;
   }catch(e){doc.state='Failed';doc.error=e.message;failures.push(`${file.name}: ${e.message}`);}
   renderQueue();renderReferences();
  }
 }finally{setBusy(false);renderQueue();renderReferences();$('paperFile').value='';$('sourceFile').value='';$('uploadStatus').textContent=`${succeeded} file(s) added.${failures.length?' '+failures.join(' | '):''}`;await renderHistory();}
}
$('paperFile').onchange=e=>loadFiles(e.target.files);
$('sourceFile').onchange=e=>loadFiles(e.target.files,true);
$('drop').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!busy){e.preventDefault();$('paperFile').click();}};
for(const event of ['dragenter','dragover'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.add('over');});
for(const event of ['dragleave','drop'])$('drop').addEventListener(event,e=>{e.preventDefault();$('drop').classList.remove('over');});
$('drop').addEventListener('drop',e=>loadFiles(e.dataTransfer.files));
$('addPaper').onclick=async()=>{
 const text=$('paper').value.trim();if(text.length<50){status('Paste at least 50 characters.');return;}if(documents.length>=config.maxPapers){status('Use up to 20 papers per batch.');return;}
 if(documents.some(d=>d.text===text)){status('This paper is already in the queue.');return;}
 const doc={id:crypto.randomUUID(),name:$('paperName').value.trim()||'Pasted paper',text,createdAt:new Date().toISOString(),state:`Ready · ${tokens(text).length} words`,result:null};documents.push(doc);$('paper').value='';$('paperName').value='';renderQueue();await persist(doc);await renderHistory();status('Paper added to queue.');
};
async function search(query){const res=await fetch('/api/web-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query}),signal:AbortSignal.timeout(15000)});const body=await res.json();if(!res.ok)throw Error(body.error||'Search unavailable.');return body;}
$('analyze').onclick=async()=>{
 if(busy)return;const ready=documents.filter(d=>d.text&&!d.error);if(!ready.length){status('Add at least one readable paper first.');return;}
 const settings={minWords:Number($('minWords').value),excludeQuotes:$('excludeQuotes').checked,excludeReferences:$('excludeReferences').checked};
 const useWeb=$('autoWeb').checked,compareBatch=$('compareBatch').checked;setBusy(true);$('progress').hidden=false;$('progress').max=ready.length;$('progress').value=0;let complete=0,failed=0;const cache=new Map();
 try{for(const doc of ready){
  doc.state='Checking';doc.analysisError=null;doc.result=null;if(selected?.id===doc.id)$('report').hidden=true;renderQueue();
  try{
   status(`Checking ${complete+failed+1} of ${ready.length}: ${doc.name}`);
   let discovery={sources:[],coverage:{state:'disabled',sourceCount:0,outcomes:[]}};
   if(useWeb){doc.state='Finding public sources';renderQueue();discovery=await discover(doc.text,query=>{if(!cache.has(query))cache.set(query,search(query));return cache.get(query);},query=>status(`${doc.name}: finding sources for “${query}”…`));}
   const local=[...references,...(compareBatch?ready.filter(d=>d.id!==doc.id&&d.text!==doc.text).map(d=>({name:d.name,text:d.text})):[])];
   doc.state='Comparing passages';renderQueue();await new Promise(resolve=>setTimeout(resolve,0));
   const result=await analyzeAsync(doc.text,[...local,...discovery.sources],settings);result.coverage=discovery.coverage;result.analyzedAt=new Date().toISOString();result.batchCompared=compareBatch;doc.result=result;
   doc.state=result.coverage.state==='failed'?'Complete · public search failed':result.coverage.state==='partial'?'Complete · partial public coverage':result.similarity===null?'Complete · no comparison sources':'Complete';complete++;await persist(doc);
  }catch(e){doc.state='Analysis failed';doc.analysisError=e.message;failed++;}
  $('progress').value=complete+failed;renderQueue();
 }
 }finally{setBusy(false);renderQueue();await renderHistory();const first=ready.find(d=>d.result);if(first)showReport(first);status(`${complete} report(s) ready. ${failed} analysis failure(s). Check each report’s source coverage before drawing conclusions.`);}
};
const coverageLabels={completed:'Public sources compared',partial:'Partial public search — some requests failed',failed:'Public search failed — not web-checked',empty:'No public sources found — coverage is limited','no-query':'No usable search queries',disabled:'Public search switched off'};
function showReport(doc){
 selected=doc;const r=doc.result;$('report').hidden=false;$('reportName').textContent=doc.name;$('score').textContent=r.similarity===null?'Not checked':r.similarity+'%';
 $('scoreDetail').textContent=`${r.matchedWords} of ${r.eligibleWords} eligible words match. ${r.sources.filter(s=>s.words).length} matching sources out of ${r.sources.length} compared.`;
 $('scoreRules').textContent=`${r.wordCount} total words; ${r.excludedWords} excluded. Exact sequences of at least ${r.options.minWords} words. Overlapping source matches count once. Analyzed ${new Date(r.analyzedAt).toLocaleString()}.`;
 $('coverageTitle').textContent=coverageLabels[r.coverage.state];$('coverageDetail').textContent=`${r.coverage.sourceCount} public extracts compared. ${r.coverage.state==='disabled'?'Only local sources were used.':'Only sampled English Wikipedia results, not the entire web.'}`;
 $('queries').replaceChildren();for(const outcome of r.coverage.outcomes)$('queries').append(element('li',`${outcome.query} — ${outcome.state}`));
 const ranges=r.sources.flatMap(s=>s.passages).sort((a,b)=>a.start-b.start),merged=[];for(const p of ranges){if(merged.length&&p.start<=merged.at(-1).end)merged.at(-1).end=Math.max(p.end,merged.at(-1).end);else merged.push({start:p.start,end:p.end});}
 $('documentView').replaceChildren();let last=0;for(const range of merged){$('documentView').append(document.createTextNode(doc.text.slice(last,range.start)));const mark=element('mark',doc.text.slice(range.start,range.end));mark.title='Exact overlap with a compared source';$('documentView').append(mark);last=range.end;}$('documentView').append(document.createTextNode(doc.text.slice(last)));
 $('exclusions').replaceChildren();for(const range of r.excludedRanges)$('exclusions').append(element('li',`${range.reason}, characters ${range.start}–${range.end}: ${doc.text.slice(range.start,Math.min(range.end,range.start+120))}…`));if(!r.excludedRanges.length)$('exclusions').append(element('li','No text excluded.'));
 $('matches').replaceChildren();for(const source of r.sources.filter(s=>s.words)){
  const box=element('div',undefined,'match');box.append(element('h3',`${source.name} · ${source.percent}% overlap`));
  if(source.url){let url;try{url=new URL(source.url);}catch{}if(url?.protocol==='https:'){const link=element('a','Open source ↗');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}}
  for(const passage of source.passages){const pair=element('div',undefined,'evidence-pair');for(const [title,text] of [[`Your paper · characters ${passage.start}–${passage.end}`,passage.text],[`Source · characters ${passage.sourceStart}–${passage.sourceEnd}`,passage.sourceText]]){const panel=element('div');panel.append(element('small',title),element('blockquote',text));pair.append(panel);}box.append(pair);}$('matches').append(box);
 }
 if(!ranges.length)$('matches').append(element('p',r.sources.length?'No exact matches found in the compared sources. This does not prove originality.':'No comparison sources were available. No similarity check was possible.'));
 $('limitations').textContent=r.limitations;$('report').scrollIntoView({behavior:'smooth',block:'start'});
}
$('download').onclick=()=>{if(selected?.result)downloadPDF(selected);};
$('downloadText').onclick=()=>{if(!selected?.result)return;const url=URL.createObjectURL(new Blob([reportLines(selected).join('\n\n')],{type:'text/plain;charset=utf-8'})),link=element('a');link.href=url;link.download='verifyscholar-report.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
async function renderHistory(){
 $('historyList').replaceChildren();try{const records=(await history.list()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if(!records.length)$('historyList').append(element('p','No saved papers. History is optional.'));
  for(const record of records){const row=element('div',undefined,'queue-row'),info=element('div');info.append(element('strong',record.name),element('small',new Date(record.createdAt).toLocaleString()));row.append(info);
   if(record.result)row.append(action('Open report',()=>showReport(record)));
   row.append(action('Use in batch',()=>{if(busy)return;if(documents.some(d=>d.id===record.id||d.text===record.text)){status('Already in the queue.');return;}if(documents.length>=config.maxPapers){status('Batch limit reached.');return;}documents.push(structuredClone(record));renderQueue();status('Saved paper added without reuploading.');}));
   row.append(action('Delete',async()=>{if(busy)return;await history.remove(record.id);documents=documents.filter(d=>d.id!==record.id);if(selected?.id===record.id){selected=null;$('report').hidden=true;}renderQueue();await renderHistory();status('Saved paper and report deleted from this browser.');}));$('historyList').append(row);
  }
 }catch{$('historyList').append(element('p','Device history is unavailable. You can still analyze and download reports without saving.'));}
}
$('remember').onchange=async()=>{if($('remember').checked){for(const doc of documents.filter(d=>d.text))await persist(doc);await renderHistory();}};
$('deleteAll').onclick=async()=>{if(busy)return;try{await history.clear();documents=[];references=[];selected=null;$('report').hidden=true;$('paper').value='';$('paperName').value='';$('remember').checked=false;renderQueue();renderReferences();await renderHistory();status('Saved data and the current queue have been cleared. Downloaded reports are not deleted.');}catch{status('Unable to delete device history. Try clearing site data in your browser settings.');}};
renderHistory();
