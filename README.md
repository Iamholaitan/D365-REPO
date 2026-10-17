# Originality — Netlify edition

A free-to-run project-paper comparison app with experimental writing-style indicators. No paid API is required. Document extraction and similarity analysis run in the browser; public-source discovery uses a Netlify function.

## Develop

Use Node.js 22 or newer:

```sh
npm ci
npm test
npm run dev
```

The development server uses port 8888 and serves the production build and public-search function. Restart after edits. `PORT` overrides the port.

## Deploy to Netlify

1. Push this project, including `package-lock.json` and `netlify.toml`, to your GitHub repository.
2. In Netlify, add a project by importing that GitHub repository.
3. Netlify reads the included settings: build `npm run build`, publish directory `dist`, functions directory `netlify/functions`, Node 22.
4. Deploy. No API keys or environment secrets are needed.
5. Verify a document upload, compare identical paper/reference text (expect 100%), then search for `education`, add an article, and compare again.

Use Git-connected deployment. Uploading only `dist` through static drag-and-drop does not deploy the web-search function.

The app needs no paid APIs. Netlify's free plan has usage limits and its current pricing/terms apply; unlimited free hosting is not guaranteed. This task has not deployed to your account.

## Public web coverage

- **Find articles** searches English Wikipedia and returns up to five extracts of up to 18,000 characters each. Click **Add to comparison** to include a result. This is limited public-web discovery, not a complete internet or automatic paper-wide scan.
- **Search wider web** opens an exact-phrase Google search. Read relevant pages and paste their text as references. Results are not automatically fetched or included in scores.
- Only the search query you explicitly enter is sent to a provider. Paper text and uploaded documents are processed in the browser, without document storage or external AI services. Netlify/provider request logging and provider policies apply to searches.
- Source URLs appear with matches and in downloaded reports. Missing, failed, and empty searches are not evidence of originality.

## Turnitin

**Not connected.** There is no free public endpoint for Turnitin's private databases. An institutional agreement and authorized API access are required; student logins alone do not provide this. A future integration needs the approved API product, tenant endpoint, and server-side credentials. Never put credentials in browser JavaScript or Git. No mock score or undocumented Turnitin integration is included.

## Limitations

- TXT, Markdown, DOCX, and text-based PDFs: 12 MB maximum, 200 PDF pages, 200,000 extracted characters. Scans need separate OCR.
- Similarity counts words in exact matching sequences of seven or more words against added sources. Duplicate overlaps count once. Quotations/citations count; paraphrases are not detected.
- AI-writing indicators are unvalidated sentence-length and transition heuristics, **not a trained detector or AI-authorship probability**. Do not use them for academic penalties. At least 200 words are required to display the assessment.
- Similarity is not a plagiarism verdict; zero overlap does not prove originality.

## Validation

`npm test` checks the browser comparison engine and Netlify function with mocked provider responses. `npm run build` bundles PDF/DOCX tools and the PDF worker, with no runtime CDN dependency. Live provider access and Netlify deployment must also be verified in the deployed environment.

The previous Python implementation is retained for reference, but is not the Netlify runtime. Use the Node workflow for the updated UI.
