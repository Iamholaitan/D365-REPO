const endpoint='https://en.wikipedia.org/w/api.php';
const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
const respond=(statusCode,body)=>({statusCode,headers,body:JSON.stringify(body)});

export async function searchWikipedia(query,fetcher=fetch){
  const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:query,gsrnamespace:'0',gsrlimit:'5',prop:'extracts|info',explaintext:'1',exlimit:'5',exchars:'18000',inprop:'url'});
  const res=await fetcher(`${endpoint}?${params}`,{headers:{'User-Agent':'Originality/0.2 (educational source comparison)'},signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!res.ok)throw Error('Public-source provider is temporarily unavailable.');
  const body=await res.json();
  if(body.error)throw Error('Public-source provider rejected this search.');
  return Object.values(body.query?.pages||{}).filter(p=>p.extract?.trim()).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>({name:p.title,text:p.extract.slice(0,18000),url:`https://en.wikipedia.org/?curid=${p.pageid}`,provider:'English Wikipedia'}));
}

export async function handler(event){
  if(event.httpMethod!=='POST')return respond(405,{error:'Use POST.'});
  if(!event.body||event.body.length>4000)return respond(400,{error:'Enter a search query of 3–200 characters.'});
  let query;
  try{query=JSON.parse(event.body).query;}catch{return respond(400,{error:'Invalid JSON.'});}
  if(typeof query!=='string'||query.trim().length<3||query.length>200)return respond(400,{error:'Enter a search query of 3–200 characters.'});
  try{return respond(200,{sources:await searchWikipedia(query.trim()),coverage:'English Wikipedia only; up to five article extracts. Not a whole-web or Turnitin scan.'});}
  catch{return respond(502,{error:'Public-source search is unavailable. Try again later or add references manually. Your paper has not been web-checked.'});}
}
