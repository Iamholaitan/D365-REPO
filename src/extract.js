import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth/mammoth.browser.js';
pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';

export async function extractFile(file){
  if(file.size>12*1024*1024)throw Error('Choose a file smaller than 12 MB.');
  const extension=file.name.split('.').pop().toLowerCase();
  let text;
  if(['txt','md'].includes(extension))text=await file.text();
  else if(extension==='docx')text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
  else if(extension==='pdf'){
    const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
    try{
      const pdf=await task.promise;
      if(pdf.numPages>200)throw Error('PDFs must have 200 pages or fewer.');
      const pages=[];
      for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();pages.push(content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));}
      text=pages.join('\n');
    }finally{await task.destroy();}
  }else throw Error('Choose TXT, Markdown, DOCX, or a text-based PDF.');
  if(!text.trim())throw Error('No text found. Scanned PDFs need OCR before uploading.');
  if(text.length>200000)throw Error('Documents must contain at most 200,000 characters.');
  return text;
}
