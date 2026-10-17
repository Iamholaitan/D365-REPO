# VerifyScholar MVP plan

The user's explicit free/no-sign-up requirement overrides accounts, subscriptions, and billing in the supplied master brief. This iteration removes mandatory manual source entry. It is not the complete institutional platform.

## Architecture and modules

- Static browser application on Netlify: batch extraction, comparison, report viewing and PDF export. Keep confidential originals off the server.
- Netlify `web-search` function: anonymous, bounded requests to the fixed Wikipedia API. It has no document storage and needs no paid API.
- `src/analysis.js`: exact token-shingle matching, configurable minimum length and quotation/reference exclusions. Count the union of matched eligible word positions, never sum source percentages.
- `src/discovery.js`: derive up to three short topic queries per paper, fetch public extracts, deduplicate sources, report partial/failed/empty coverage distinctly.
- `src/storage.js`: actual IndexedDB persistence on the user's device. Optional retention, individual deletion and delete-all. This is not a shared institutional server database.
- `src/report.js`: PDF report generation with metadata, coverage, score rules, evidence, exclusions and limitations.

## Local database schema (version 1)

`documents` object store, primary key `id` (UUID): `name`, `text`, `createdAt`, `result` (nullable), `state`. Result contains source metadata, matched passages, query outcomes and options used. No original binary files or authentication secrets are stored. Replacements use the same key. Records can be deleted individually or all at once. Anyone with access to this browser profile can access saved work; retention is opt-in. Changing browsers/devices does not transfer data.

## Milestones

1. Document architecture, privacy boundary and honest coverage.
2. Batch paper/reference import and optional comparisons within the batch; automatic public source discovery with failure-aware reports; browser history and deletion; evidence viewer and PDF export.
3. Automated unit and browser tests, production build, GitHub push, Netlify deployment verification if the site connection is available.

## Risks and planned limits

Wikipedia is limited coverage, not a whole-web or Turnitin scan. No results cannot prove originality. A no-account public service needs host quotas; Netlify free hosting is not unlimited. Source queries can reveal topics, so the UI discloses transmission and offers local-only analysis. Large batches run sequentially; extraction failures are isolated per file. Retention is private to the device, not encrypted institutional storage. OCR, semantic embeddings, validated AI detection, malware scanning, shared repositories and role-based access need separate implementation/services. None will be simulated.

## Requirements status

Implemented and verification evidence are recorded in README after testing. Deferred: near-duplicate/semantic retrieval, OCR, validated AI model, full citation-style validation, institution accounts/roles/repositories, server database, audit logs, malware scanning and compliance certification. Accounts/billing are intentionally excluded by the user's request. Netlify publication requires a connected Git site or authorized Netlify access; no credentials are present in this workspace.
