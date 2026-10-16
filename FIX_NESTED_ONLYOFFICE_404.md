# Fix: ONLYOFFICE nested document editor 404 — 2026-10-16

## Confirmed failure

After `document:open-buffer`, ONLYOFFICE generated a nested iframe URL

`/nursememo-office/web-apps/apps/documenteditor/main/nursememo-office/index.html?...`

This URL is incorrect. ONLYOFFICE expects:

`/nursememo-office/web-apps/apps/documenteditor/main/index.html?...`

The original deployment's global asset rewrite had changed the SDK's literal filename suffix `"/index.html"` to `"/nursememo-office/index.html"`. The SDK appends that suffix to the already complete `web-apps/apps/documenteditor/main` directory. This created a second, misplaced copy of the project path.

## Changes

- `scripts/prepare-pages.mjs`: NEVER rewrite SDK's internal `"/index.html"` as a site-root resource. Restrict root-document link rewriting to top-level HTML entry points.
- `scripts/verify-site.mjs`: require the actual `web-apps/apps/documenteditor/main/index.html` and upstream `api.js` in the staged output, and fail if the SDK path suffix was corrupted.
- `tests/prepare-pages.test.mjs`: add an explicit regression reproducing this exact failure and test the nested editor asset after packaging.
- `diagnostics.html`: distinguish a `document:opened` API acknowledgment from a successfully reachable inner ONLYOFFICE editor frame; report failing nested frame URLs rather than a false success.
- `office-build.json` generated during deployment now includes `packagingFix: "onlyoffice-nested-index-path-v2"`.

## Deploy

1. Upload all contents of the replacement ZIP to **tkchan002/nursememo-office** `main`, preserving `.github/workflows`. Replace existing files.
2. In Settings → Pages, select **GitHub Actions**.
3. Wait for **Build and Deploy Nurse Memo Office** to complete.
4. Visit `https://tkchan002.github.io/nursememo-office/office-build.json` and confirm `packagingFix` equals `onlyoffice-nested-index-path-v2`.
5. Visit `https://tkchan002.github.io/nursememo-office/diagnostics.html`, choose the normal Night Memo, then the 72-row sample. Confirm the editor is visible and that DOCX and PDF exports work.

No changes are required to the main Nurse Memo/Patrol Night repository, Supabase, or domain records.

## Test scope

Local packaging tests prove that the `/index.html` suffix is preserved and the final asset path exists in a simulated static build. They do not prove the complete upstream WASM engine runs successfully on GitHub Pages; verify that on the deployed site.
