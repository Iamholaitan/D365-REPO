"""Originality: private, local project-paper comparison. Run: python server.py."""
import io
import json
import os
import re
import statistics
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).parent
MAX_BYTES = 12 * 1024 * 1024


def tokens(text):
    return list(re.finditer(r"\b\w+(?:['’]\w+)?\b", text.lower()))


def analyze(text, sources):
    if not isinstance(text, str) or not 50 <= len(text) <= 200000:
        raise ValueError('Enter between 50 and 200,000 characters for your paper.')
    if not isinstance(sources, list) or len(sources) > 20:
        raise ValueError('Use up to 20 reference documents.')
    words = tokens(text)
    values = [m.group() for m in words]
    covered = set()
    reports = []
    for source in sources:
        if not isinstance(source, dict) or not isinstance(source.get('text'), str) or len(source['text']) > 200000:
            raise ValueError('Each reference must contain at most 200,000 characters.')
        ref = [m.group() for m in tokens(source['text'])]
        windows = {tuple(ref[i:i+7]) for i in range(len(ref)-6)}
        hits = set()
        for i in range(len(values)-6):
            if tuple(values[i:i+7]) in windows:
                hits.update(range(i, i+7))
        covered.update(hits)
        spans = []
        for i in sorted(hits):
            if spans and i == spans[-1][1]:
                spans[-1][1] = i+1
            else:
                spans.append([i, i+1])
        reports.append({'name': str(source.get('name', 'Reference'))[:150], 'words': len(hits),
                        'percent': round(100*len(hits)/max(1,len(words)),1),
                        'passages': [{'start':words[a].start(), 'end':words[b-1].end(),
                                      'text':text[words[a].start():words[b-1].end()]} for a,b in spans]})
    sentences = [len(tokens(s)) for s in re.split(r'[.!?]+', text) if len(tokens(s)) >= 3]
    avg = statistics.mean(sentences) if sentences else 0
    variation = statistics.pstdev(sentences)/avg if avg else 0
    phrases = re.findall(r'\b(?:in conclusion|furthermore|moreover|it is important to note|in today.s world|delve into)\b',text.lower())
    return {'wordCount':len(words), 'similarity':round(100*len(covered)/max(1,len(words)),1) if sources else None,
            'matchedWords':len(covered), 'sources':sorted(reports,key=lambda s:-s['words']),
            'writing':{'sentences':len(sentences), 'averageSentence':round(avg,1),
                       'variation':round(variation,2), 'transitions':len(phrases),
                       'enoughText':len(words)>=200,
                       'assessment':'Some repetitive style signals' if len(words)>=200 and (variation<0.35 or len(phrases)>=4) else 'No strong pattern in these limited style checks'},
            'limitations':'Similarity only compares the references you supply, using exact sequences of seven or more words. It does not search the web, university databases, or Turnitin. Quoted and cited passages are included. Style signals cannot determine whether a human or AI wrote a document.'}


def extract(data, filename):
    suffix = Path(filename).suffix.lower()
    if suffix in ('.txt', '.md'):
        return data.decode('utf-8-sig')
    if suffix == '.pdf':
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        if len(reader.pages) > 200:
            raise ValueError('PDFs must have 200 pages or fewer.')
        return '\n'.join(page.extract_text() or '' for page in reader.pages)
    if suffix == '.docx':
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            info = archive.getinfo('word/document.xml')
            if info.file_size > MAX_BYTES:
                raise ValueError('This document is too large to extract.')
            root = ElementTree.fromstring(archive.read(info))
            ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            return '\n'.join(''.join(p.itertext()) for p in root.findall('.//w:p',ns))
    raise ValueError('Choose a TXT, Markdown, DOCX, or text-based PDF file.')


class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(ROOT/'static'),**kwargs)

    def do_POST(self):
        try:
            length = int(self.headers.get('Content-Length','0'))
            if not 0 < length <= MAX_BYTES:
                raise ValueError('Upload limit is 12 MB.')
            data = self.rfile.read(length)
            if self.path == '/api/analyze':
                body = json.loads(data)
                result = analyze(body.get('text'),body.get('sources',[]))
            elif self.path == '/api/extract':
                from urllib.parse import unquote
                text = extract(data,unquote(self.headers.get('X-Filename','')))
                if not text.strip():
                    raise ValueError('No text found. Scanned PDFs need OCR before uploading.')
                if len(text)>200000:
                    raise ValueError('Documents must contain at most 200,000 characters.')
                result = {'text':text}
            else:
                self.send_error(404)
                return
            self.respond(200,result)
        except (ValueError, UnicodeError) as exc:
            self.respond(400,{'error':str(exc)})
        except Exception:
            self.respond(400,{'error':'Unable to read this document. Check its format and try again.'})

    def respond(self,status,body):
        raw = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == '__main__':
    port = int(os.environ.get('PORT','8000'))
    print(f'Originality running on port {port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
