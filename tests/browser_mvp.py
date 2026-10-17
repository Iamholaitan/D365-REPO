"""Optional end-to-end check: start npm run dev, then run with Python Playwright and Chromium installed."""
from playwright.sync_api import sync_playwright, expect
import os

BASE=os.environ.get('TEST_URL','http://127.0.0.1:8888')
TEXT='Community education improves sustainable development through practical learning and local collaboration. Independent discussion explores long term economic benefits in rural regions.'

def file(name,text):return {'name':name,'mimeType':'text/plain','buffer':text.encode()}

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/api/web-search',lambda route:route.fulfill(json={'sources':[{'name':'Public source','url':'https://en.wikipedia.org/?curid=1','text':TEXT}]}))
    page.goto(BASE);page.check('#remember')
    page.locator('#paperFile').set_input_files([file('first.txt',TEXT),file('second.txt',TEXT+' A different ending considers other research questions.'),file('bad.txt','tiny')])
    expect(page.locator('#uploadStatus')).to_contain_text('2 file(s) added.')
    expect(page.locator('#queue')).to_contain_text('At least 50 characters')
    page.click('#analyze');expect(page.locator('#status')).to_contain_text('2 report(s) ready.',timeout=30000)
    expect(page.locator('#score')).to_have_text('100%')
    expect(page.locator('#coverageTitle')).to_have_text('Public sources compared')
    expect(page.locator('#documentView mark')).not_to_have_count(0)
    expect(page.locator('#matches')).to_contain_text('Public source')
    expect(page.locator('#matches')).to_contain_text('Source · characters')
    with page.expect_download() as info:page.click('#download')
    download=info.value;assert download.suggested_filename.endswith('.pdf');download.save_as('/tmp/verifyscholar-report.pdf')
    with open('/tmp/verifyscholar-report.pdf','rb') as stream:assert stream.read(5)==b'%PDF-'
    page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path='/tmp/verifyscholar-mobile.png',full_page=True)
    page.reload();expect(page.locator('#historyList')).to_contain_text('first.txt');expect(page.locator('#historyList')).to_contain_text('second.txt')
    page.locator('#historyList .queue-row').filter(has_text='first.txt').get_by_role('button',name='Open report').click();expect(page.locator('#score')).to_have_text('100%')
    page.locator('#historyList .queue-row').filter(has_text='first.txt').get_by_role('button',name='Use in batch').click();expect(page.locator('#queue')).to_contain_text('first.txt')
    page.locator('#historyList .queue-row').filter(has_text='first.txt').get_by_role('button',name='Delete',exact=True).click();expect(page.locator('#historyList')).not_to_contain_text('first.txt')
    page.click('#deleteAll');expect(page.locator('#historyList')).to_contain_text('No saved papers');expect(page.locator('#queue').locator('.queue-row')).to_have_count(0)
    page.reload();expect(page.locator('#historyList')).to_contain_text('No saved papers')
    page.unroute('**/api/web-search');page.route('**/api/web-search',lambda route:route.fulfill(status=502,json={'error':'Provider unavailable'}))
    page.locator('#paperFile').set_input_files(file('offline.txt',TEXT));expect(page.locator('#uploadStatus')).to_contain_text('1 file(s) added.')
    page.click('#analyze');expect(page.locator('#status')).to_contain_text('1 report(s) ready.',timeout=30000)
    expect(page.locator('#score')).to_have_text('Not checked');expect(page.locator('#coverageTitle')).to_have_text('Public search failed — not web-checked')
    page.uncheck('#autoWeb')
    page.locator('.advanced summary').click()
    page.locator('#sourceFile').set_input_files([file('ref1.txt',TEXT),file('ref2.txt','A separate paper describes different biodiversity concepts and environmental research methods.')])
    expect(page.locator('#sources li')).to_have_count(2)
    page.click('#analyze');expect(page.locator('#status')).to_contain_text('1 report(s) ready.');expect(page.locator('#coverageTitle')).to_have_text('Public search switched off');expect(page.locator('#score')).to_have_text('100%')
    assert not errors,errors
    print('PASS: multi-file import, per-file error, automatic sources, worker analysis, highlights, evidence, PDF, mobile layout, reload/history, reuse, individual/all deletion, failed web search, batch references, local-only scan. Public provider responses mocked.')
    browser.close()
