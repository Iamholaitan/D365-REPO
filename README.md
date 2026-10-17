# VerifyScholar — free, no-sign-up batch checker

Upload up to 20 papers at once, click **Check all papers**, and review a separate evidence report for each. No accounts, subscriptions, paid detection APIs, or manual source-by-source uploads are required. Product naming is configurable in `src/config.js`.

## What works

- Multi-file PDF, DOCX, TXT and Markdown import, drag-and-drop, per-file extraction status/errors and pasted text.
- Up to 20 optional reference files selected together. Optional comparisons within a batch, without sharing papers outside the browser.
- Automatic public-source discovery: up to three keyword queries per paper search **English Wikipedia**, retrieving up to five article extracts per query and adding them directly to comparison. Sources are deduplicated. Search failures, partial coverage, empty results, and local-only analysis are distinct report states.
- Exact matching with source and submitted-text offsets, highlighted document text, side-by-side evidence, source links and retrieval dates.
- Configurable 7/10/15/20-word minimum and optional exclusions for double-quoted text and a final References/Bibliography/Works Cited section. Denominator is eligible word count; overlapping matches count once. Excluded ranges are reviewable. These are heuristic formatting rules, not citation validation.
- Actual downloadable PDF and text reports. AI authorship is explicitly unavailable; no invented AI percentages or style-based accusations.
- Opt-in IndexedDB history on the current browser profile: reopen reports, reuse papers, delete individually or clear all saved data. No database account or external document storage.
- Analysis runs in a browser worker. Documents are processed sequentially with progress and isolated failures.

## Run and test

Node 22 or newer:

```sh
npm ci
npm test
npm run dev
```

The dev server uses port 8888; set `PORT` to override. Restart after editing. `npm run build` builds `dist` and bundles extraction tools, comparison worker and PDF export with no runtime CDN dependency.

Optional browser regression suite (requires Python Playwright and Chromium already installed):

```sh
python tests/browser_mvp.py
```

`TEST_URL` and `CHROMIUM_PATH` can override the local test server and Chromium path. Browser tests mock external provider responses; they do not establish live Wikipedia availability. Tests exercise batch import, failure isolation, automatic source inclusion, worker comparison, highlights, evidence, PDF download, mobile layout, retention/reload, reuse, deletion, local-only checks and failed discovery. Node tests cover overlap scoring, evidence offsets, exclusions and source-discovery outcomes.

## Netlify

The configured target supplied by the owner is `https://plagarismmba.netlify.app/`.

Connect the `main` branch of `Iamholaitan/D365-REPO` to that Netlify site. The included `netlify.toml` specifies:

- Build: `npm run build`
- Publish: `dist`
- Functions: `netlify/functions`
- Node: 22

No application environment secrets are required. A Git-connected site redeploys after a push if automatic deploys are enabled. A successful Git push alone does not establish a successful Netlify deployment. Verify the latest commit in Netlify's Deploys panel, open the site, then test a batch upload and public-source discovery. Static drag-and-drop of `dist` alone omits the server function.

No paid APIs are needed. Netlify's current free-plan limits still apply; unlimited free hosting is not guaranteed. The anonymous public function only calls a fixed provider, validates query lengths and has upstream timeouts. Host quotas and monitoring are needed for large public usage; no global distributed rate limiter is implemented.

## Data and privacy

Original file bytes are not uploaded or retained. Extracted text is processed in the browser. With automatic discovery enabled, clicking Check sends up to three short topic queries per paper to the Netlify function and English Wikipedia. This may reveal document topics; turn it off for sensitive work. The full paper is not sent to the provider. Provider and hosting access logs/policies apply.

Device history is off by default. If enabled, the `verifyscholar-local` IndexedDB database stores records in its `documents` store: `id`, `name`, `text`, `createdAt`, `state`, and optional report containing source metadata/evidence. Anyone using the same browser profile can access it. It is not encrypted institutional storage or cross-device sync. Disabling retention stops future saves, but does not erase existing records. Delete removes stored records; clear-all also empties the active queue. Previously downloaded reports remain on disk. Original binary files are never stored by the app.

## Honest limitations and remaining requirements

- **Not a Turnitin connection or whole-web scanner.** No authorized API access was supplied. Wikipedia is a small public subset; matching against sampled extracts cannot prove originality.
- Exact matches only. Near-duplicate, semantic matching, embeddings and private institutional repositories are not implemented.
- AI detection is not available because no validated model is connected. No detector accuracy or probability is claimed.
- Scanned PDFs need external OCR. Limits: 12 MB/file, 200 PDF pages, 200,000 extracted characters/document. No malware scanner is included.
- Citation validation, institutional roles, shared server database, assignments, auditing, commercial billing, compliance certification and OCR remain out of scope for this no-sign-up iteration.
- PDF export uses standard PDF fonts; some non-Latin characters may not render correctly. The UTF-8 text export preserves them.
- Similarity is not evidence of misconduct by itself. Review quotations, references and context.

See `docs/MVP.md` for the architecture, local schema and phased requirements checklist. The old Python server is retained for reference and is not the runtime for the current UI.
