export function analyzeAsync(text,sources,settings){
  return new Promise((resolve,reject)=>{
    const worker=new Worker('/analysis.worker.js',{type:'module'});
    const finish=()=>{clearTimeout(timer);worker.terminate();};
    const timer=setTimeout(()=>{finish();reject(Error('Comparison took too long. Try fewer or smaller documents.'));},60000);
    worker.onmessage=event=>{finish();event.data.error?reject(Error(event.data.error)):resolve(event.data.result);};
    worker.onerror=()=>{finish();reject(Error('Unable to run comparison. Reload the page and try again.'));};
    worker.postMessage({text,sources,settings});
  });
}
