import {jsPDF} from 'jspdf';
import {config} from './config.js';
export function reportLines(document){
  const r=document.result;
  return [`${config.name} — similarity report`,document.name,`Analyzed: ${r.analyzedAt}`,`Similarity: ${r.similarity===null?'Not checked':r.similarity+'%'}`,`Matched words: ${r.matchedWords} / ${r.eligibleWords} eligible words (${r.wordCount} total; ${r.excludedWords} excluded).`,
    `Matched sources: ${r.sources.filter(s=>s.words).length}. Matching passages: ${r.sources.reduce((n,s)=>n+s.passages.length,0)}.`,
    `Public discovery: ${r.coverage.state}; ${r.coverage.sourceCount||0} public sources. English Wikipedia only.`,
    ...r.coverage.outcomes.map(o=>`Query: ${o.query} — ${o.state}`),
    `Rules: minimum ${r.options.minWords} words; exclude quotations: ${r.options.excludeQuotes}; exclude references: ${r.options.excludeReferences}. Overlapping matches count only once.`,
    'AI detection unavailable: no validated model is connected. No authorship probability is calculated.',
    'SIMILARITY EVIDENCE',...r.sources.flatMap(s=>[`${s.name}: ${s.percent}% (${s.words} words)`,s.url||'Local reference',s.retrievedAt?`Retrieved: ${s.retrievedAt}`:'',...s.passages.flatMap(p=>[`Paper, characters ${p.start}–${p.end}: ${p.text}`,`Source, characters ${p.sourceStart}–${p.sourceEnd}: ${p.sourceText}`])]),
    'LIMITATIONS',r.limitations,'Similarity is not proof of plagiarism. No matches does not prove originality.'];
}
export function downloadPDF(document){
  const pdf=new jsPDF(),pageHeight=pdf.internal.pageSize.getHeight();let y=18;
  pdf.setFontSize(10);
  for(const paragraph of reportLines(document)){
    for(const line of pdf.splitTextToSize(paragraph,175)){
      if(y>pageHeight-20){pdf.addPage();y=18;}
      pdf.text(line,18,y);y+=5;
    }y+=3;
  }
  pdf.save(document.name.replace(/\.[^.]+$/,'').replace(/[^\p{L}\p{N}_ -]/gu,'').slice(0,80)+'-report.pdf');
}
