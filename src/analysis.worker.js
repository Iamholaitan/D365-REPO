import {analyze} from './analysis.js';
self.onmessage=event=>{
  try{self.postMessage({result:analyze(event.data.text,event.data.sources,event.data.settings)});}
  catch(error){self.postMessage({error:error.message});}
};
