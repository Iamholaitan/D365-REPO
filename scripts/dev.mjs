import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {handler} from '../netlify/functions/web-search.mjs';
const root=path.resolve('dist');
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/api/web-search'){
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4000){res.writeHead(413);res.end();return;}}
      const result=await handler({httpMethod:req.method,body});res.writeHead(result.statusCode,result.headers);res.end(result.body);return;
    }
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||8888),'127.0.0.1',()=>console.log('Originality development server on port '+(process.env.PORT||8888)));
