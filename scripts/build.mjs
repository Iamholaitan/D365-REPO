import {build} from 'esbuild';
import {mkdir,cp,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('static','dist',{recursive:true});
await build({entryPoints:['static/app.js'],bundle:true,format:'esm',outfile:'dist/app.js',minify:true,target:['es2022']});
await build({entryPoints:['src/analysis.worker.js'],bundle:true,format:'esm',outfile:'dist/analysis.worker.js',minify:true,target:['es2022']});
await copyFile('node_modules/pdfjs-dist/build/pdf.worker.min.mjs','dist/pdf.worker.min.mjs');
console.log('Built Netlify site in dist/');
